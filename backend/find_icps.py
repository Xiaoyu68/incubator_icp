"""
ICP Finder Agent — Multi-agent search
Orchestrates platform-specific subagents (Reddit, X, LinkedIn, Indie Hackers,
Hacker News, Product Hunt, Dev.to) to find real people matching an ICP description.
"""

import anyio
from anyio import Path as AsyncPath
import json
import logging
import sys
from datetime import datetime
from pathlib import Path

from claude_agent_sdk import query, ClaudeAgentOptions, ResultMessage

logger = logging.getLogger(__name__)

# --- Constants ---
SCRIPT_DIR = Path(__file__).resolve().parent
PLATFORM_MAX_TURNS = 30
ORCHESTRATOR_MAX_TURNS = 5


# --- Progress Monitor ---

class ProgressMonitor:
    """Live terminal progress display for multi-platform ICP search."""

    STATUS_ICONS = {
        "pending": "○",
        "searching": "◉",
        "done": "✓",
        "error": "✗",
        "merging": "⟳",
    }

    def __init__(self, platform_names: list[str]):
        self.platforms = {name: {"status": "pending", "found": 0} for name in platform_names}
        self.platform_order = platform_names
        self.total = len(platform_names)
        self.completed = 0
        self._lines_printed = 0

    def _clear_previous(self):
        if self._lines_printed > 0:
            sys.stdout.write(f"\033[{self._lines_printed}A\033[J")

    def _pct(self) -> int:
        # Count searching platforms as half-done
        searching = sum(1 for p in self.platforms.values() if p["status"] == "searching")
        return int(((self.completed + searching * 0.5) / (self.total + 1)) * 100)

    def render(self):
        self._clear_previous()
        lines = []
        pct = self._pct()
        bar_width = 30
        filled = int(bar_width * pct / 100)
        bar = "█" * filled + "░" * (bar_width - filled)

        lines.append(f"  Progress: [{bar}] {pct}%")
        lines.append(f"  {'─' * 55}")
        lines.append(f"  \033[1m  {'Platform':<16} {'Status':<12} {'Found':<8}\033[0m")
        lines.append(f"  {'─' * 55}")

        for name in self.platform_order:
            info = self.platforms[name]
            icon = self.STATUS_ICONS[info["status"]]
            status_text = info["status"].upper()

            if info["status"] == "done":
                found_col = str(info["found"])
            elif info["status"] == "error":
                found_col = "—"
            else:
                found_col = "—"

            # Color codes
            if info["status"] == "searching":
                color_start, color_end = "\033[33m", "\033[0m"  # yellow
            elif info["status"] == "done":
                color_start, color_end = "\033[32m", "\033[0m"  # green
            elif info["status"] == "error":
                color_start, color_end = "\033[31m", "\033[0m"  # red
            else:
                color_start, color_end = "\033[90m", "\033[0m"  # gray

            lines.append(f"  {color_start}{icon} {name:<16} {status_text:<12} {found_col:<8}{color_end}")

        # Orchestrator line
        total_found = sum(p["found"] for p in self.platforms.values())
        merging = any(p["status"] == "merging" for p in self.platforms.values())
        if self.completed == self.total and not merging:
            lines.append(f"  {'─' * 55}")
            lines.append(f"  \033[32m✓ {'Orchestrator':<16} {'DONE':<12} {total_found:<8}\033[0m")
        elif merging or self.completed == self.total:
            lines.append(f"  {'─' * 55}")
            lines.append(f"  \033[33m⟳ {'Orchestrator':<16} {'MERGING':<12} {'—':<8}\033[0m")

        lines.append("")
        output = "\n".join(lines)
        sys.stdout.write(output + "\n")
        sys.stdout.flush()
        self._lines_printed = len(lines) + 1

    def start_platform(self, name: str):
        self.platforms[name]["status"] = "searching"
        self.render()

    def finish_platform(self, name: str, found: int):
        self.platforms[name]["status"] = "done"
        self.platforms[name]["found"] = found
        self.completed += 1
        self.render()

    def fail_platform(self, name: str):
        self.platforms[name]["status"] = "error"
        self.completed += 1
        self.render()

    def start_merge(self):
        self.render()

    def finish_merge(self):
        self.render()


# --- Shared output schema for all subagents ---

RESULT_SCHEMA = """{
  "name": "Full Name or Username",
  "platform": "reddit | x | linkedin | indie_hackers | hacker_news | product_hunt | dev_to",
  "platforms_found_on": ["reddit"],
  "profile_url": "direct link to their profile or post",
  "title_role": "their job title or role",
  "company": "company name or null",
  "industry": "industry or sector (e.g. fintech, healthtech, developer tools) or null",
  "match_evidence": "why they match the ICP — specific post, comment, or bio detail",
  "evidence_date": "date the post/comment was made (YYYY-MM-DD or YYYY-MM if exact day unknown, or null)",
  "pain_points": ["specific pain points they've expressed"],
  "contact_info": {
    "email": "publicly listed email or null",
    "twitter_handle": "@handle or null",
    "linkedin_url": "public LinkedIn URL or null",
    "website": "personal site or null"
  },
  "relevance_score": 8,
  "notes": "any additional context useful for outreach"
}"""

SHARED_RULES = """## Rules
- Find exactly 10 people. If you can't find 10 strong matches, find as many as you can and explain why in platform_notes.
- Prioritize people who have PUBLICLY expressed pain points matching the ICP.
- Every profile_url must be a real URL you found during search, not fabricated.
- relevance_score is 1-10 based on how closely they match the ICP description.
- Be thorough — run multiple search queries with different angles and keywords.
- Do NOT make up people or URLs. Only include real results from your searches.
- For contact_info, only include what is PUBLICLY visible. Set fields to null if not found. Never guess emails.
- Always try to determine industry and company — check their bio, posts, and linked website.
- Always capture the date the matching post/comment was made. Check the post timestamp.

## Output Format
You MUST respond with ONLY a valid JSON object (no markdown, no code fences, no explanation).
Use this exact structure:

{
  "platform": "your_platform",
  "results": [RESULT_SCHEMA],
  "search_queries_used": ["list of search queries you ran"],
  "platform_notes": "observations about search effectiveness on this platform"
}
""".replace("RESULT_SCHEMA", RESULT_SCHEMA)


# --- Platform-specific subagent prompts ---

REDDIT_PROMPT = """You are a Reddit research specialist. Your job is to find real people on Reddit who match a given ICP description.

## CRITICAL CONSTRAINTS
- WebFetch CANNOT access reddit.com or old.reddit.com (blocked). Do NOT try to fetch Reddit URLs directly.
- site:reddit.com Google searches are unreliable and often return nothing.
- You must find Reddit users INDIRECTLY.

## Search Strategy

### Phase 1: Google search with "reddit" as keyword (NOT site:)
1. Search for discussions that reference Reddit threads:
   - reddit founder "struggling to find customers" built
   - reddit "I built" saas "no customers" OR "zero users"
   - reddit r/startups "first customers" founder struggling
   - reddit r/SaaS "how to get users" built product
   - reddit "technical founder" "finding customers" entrepreneurship
2. Run at least 5-6 varied queries. Drop "site:" prefix — just use "reddit" as a word.
3. Use broad phrasing. Avoid over-quoting. Example: reddit founder built saas no customers

### Phase 2: Fetch articles/blogs that reference Reddit users
4. Google results often link to blog posts, newsletters, or articles that QUOTE Reddit threads and usernames.
5. Use WebFetch on these non-Reddit URLs to extract the quoted Reddit usernames and their stories.
6. Also search for aggregator sites: "best of reddit" founder struggling customers

### Phase 3: Use Reddit JSON API (this works even when WebFetch blocks reddit.com HTML)
7. Try fetching Reddit JSON endpoints — these sometimes work:
   - https://www.reddit.com/r/startups/search.json?q=finding+customers&sort=new&t=year&limit=25
   - https://www.reddit.com/r/SaaS/search.json?q=built+no+customers&sort=new&t=year&limit=25
   - https://www.reddit.com/r/Entrepreneur/search.json?q=technical+founder+customers&sort=new&t=year&limit=25
8. If JSON endpoints work, extract post titles, authors (data.children[].data.author), and selftext.

### Phase 4: Cross-reference usernames
9. When you find a Reddit username, search Google for: "reddit.com/user/USERNAME" to find their other posts or external profiles.
10. Search: "USERNAME" founder OR startup OR built to find their presence outside Reddit.

""" + SHARED_RULES

X_PROMPT = """You are an X/Twitter research specialist. Your job is to find real people on X/Twitter who match a given ICP description.

## CRITICAL CONSTRAINTS
- WebFetch CANNOT access x.com or twitter.com (blocked). Do NOT try to fetch Twitter URLs directly.
- site:x.com Google searches rarely return results (Twitter blocks crawlers).
- You must find Twitter users INDIRECTLY.

## Search Strategy

### Phase 1: Google for tweets and Twitter profiles (without site:)
1. Search with hashtags and pain point keywords:
   - #buildinpublic "no customers" OR "zero users" OR "first customer" founder
   - #indiehacker "struggling" "customers" OR "finding users"
   - #solofounder "launched" "no signups" OR "no traction"
   - twitter "technical founder" "finding customers" OR "customer discovery"
   - "built my saas" "no customers" twitter OR tweet
2. Search for build-in-public threads shared on blogs:
   - "build in public" founder "struggling with" customers blog OR newsletter
   - "twitter thread" founder "customer acquisition" struggle

### Phase 2: Fetch blogs, newsletters, and aggregator sites
3. Use WebFetch on non-Twitter URLs from search results — blogs, newsletters, and articles that quote tweets or reference Twitter founders.
4. Search for curated lists:
   - "build in public" founders list twitter 2025 OR 2026
   - "indie hackers" twitter accounts follow founder
   - typefully OR hypefury "build in public" founder struggling

### Phase 3: Product Hunt and personal sites
5. Search for recently launched products where the maker has a Twitter:
   - producthunt.com "maker" founder launched 2025 OR 2026 "finding customers"
6. When you find a founder's personal site, use WebFetch to check it for their Twitter handle and bio.

### Phase 4: Cross-reference
7. When you find a founder from any source, search: "their name" twitter OR @handle
8. Extract Twitter handles from bios, websites, and Product Hunt profiles.

""" + SHARED_RULES

LINKEDIN_PROMPT = """You are a LinkedIn research specialist. Your job is to find real people on LinkedIn who match a given ICP description.

## CRITICAL CONSTRAINTS
- WebFetch CANNOT access linkedin.com (login-gated). Do NOT try to fetch LinkedIn URLs directly.
- However, site:linkedin.com Google searches DO work for LinkedIn posts and articles.
- Extract data from Google search result SNIPPETS — the title and description shown by Google contain name, title, company.

## Search Strategy

### Phase 1: Search for LinkedIn POSTS (publicly indexed by Google)
1. LinkedIn posts are the best source — they're public and indexed:
   - site:linkedin.com/posts "finding customers" founder OR startup
   - site:linkedin.com/posts "built" "no customers" OR "no users" OR "no traction"
   - site:linkedin.com/posts "first time founder" OR "first startup" customer
   - site:linkedin.com/posts "pre-seed" "customer discovery" OR "customer acquisition"
   - site:linkedin.com/posts "launched" "struggling" users OR customers
2. From each Google result, extract: author name, title/headline, company (shown in snippet).

### Phase 2: Search for LinkedIn ARTICLES
3. LinkedIn Pulse articles are also publicly indexed:
   - site:linkedin.com/pulse "startup" "finding customers" founder
   - site:linkedin.com/pulse "technical founder" "first customers"
   - site:linkedin.com/pulse "customer acquisition" "early stage" startup

### Phase 3: Find LinkedIn PROFILES via Google snippets
4. Google shows profile summaries even though the pages are gated:
   - site:linkedin.com/in "founder" "pre-seed" OR "idea stage"
   - site:linkedin.com/in "technical cofounder" "building"
5. A Google result like "John Smith - Founder - Acme AI | LinkedIn" is enough — extract name, title, company from the snippet. Do NOT fetch the URL.

### Phase 4: Cross-reference and enrich
6. When you find a name + company, search Google for more context:
   - "John Smith" "Acme AI" founder customers OR launch OR struggle
   - This may surface their blog, Twitter, or other profiles with pain point evidence.

### KEY RULE: Never WebFetch linkedin.com — only use Google snippets.

""" + SHARED_RULES

INDIE_HACKERS_PROMPT = """You are an Indie Hackers research specialist. Your job is to find real people on Indie Hackers who match a given ICP description.

## Search Strategy

### Phase 1: Google search (good for Indie Hackers — site: works here)
1. site:indiehackers.com "pain point keywords"
2. site:indiehackers.com "finding customers" OR "no users" OR "zero customers" founder
3. site:indiehackers.com "first time founder" OR "first startup" struggling
4. site:indiehackers.com "built" "launched" "no traction" OR "no signups"

### Phase 2: Browse Indie Hackers directly with WebFetch
5. Fetch and scan these pages:
   - https://www.indiehackers.com/posts?sortBy=newest
   - https://www.indiehackers.com/group/getting-first-customers (if it exists)
6. When you find a promising post, fetch the full URL to read comments — the best ICP matches are in comments.
7. Check user profiles: https://www.indiehackers.com/USERNAME — look for product links, revenue, and bio.

### Phase 3: Cross-reference
8. When you find someone, search for their name + product on Google to find their Twitter, LinkedIn, or website.
9. Also search for Product Hunt launches linked from their profiles.

""" + SHARED_RULES


HACKER_NEWS_PROMPT = """You are a Hacker News research specialist. Your job is to find real people on Hacker News who match a given ICP description.

## Search Strategy

### Phase 1: Use Hacker News Algolia API (best approach — fully public, fast)
1. Search via the Algolia HN API — these URLs are directly fetchable:
   - https://hn.algolia.com/api/v1/search?query=finding+customers+founder&tags=ask_hn&hitsPerPage=25
   - https://hn.algolia.com/api/v1/search?query=first+users+startup+technical+founder&tags=ask_hn&hitsPerPage=25
   - https://hn.algolia.com/api/v1/search?query=no+customers+built+launched&tags=ask_hn&hitsPerPage=25
   - https://hn.algolia.com/api/v1/search?query=customer+acquisition+pre-seed&hitsPerPage=25
   - https://hn.algolia.com/api/v1/search?query=struggling+get+users+saas&hitsPerPage=25
2. Also search for "Show HN" posts with low engagement (founders launching to crickets):
   - https://hn.algolia.com/api/v1/search?query=show+hn&tags=show_hn&hitsPerPage=25&numericFilters=points<10
3. Extract author usernames, post titles, and story URLs from the JSON response (hits[].author, hits[].title, hits[].url).

### Phase 2: Fetch individual threads for detail
4. For promising posts, fetch the full thread via:
   - https://hn.algolia.com/api/v1/items/{objectID}
5. Read comments for pain points, founder details, and links to their products/profiles.

### Phase 3: Look up user profiles
6. Fetch user info: https://hn.algolia.com/api/v1/users/{username}
7. Check their "about" field for personal website, Twitter, company info.
8. Google: "{username}" founder OR startup OR built to find their other profiles.

### Phase 4: Google supplementary search
9. Search Google for HN threads shared elsewhere:
   - "news.ycombinator.com" founder "finding customers" OR "first users"
   - hacker news "ask hn" "how did you get" first customers
10. Fetch any blog posts or articles that reference specific HN threads.

""" + SHARED_RULES

PRODUCT_HUNT_PROMPT = """You are a Product Hunt research specialist. Your job is to find real people on Product Hunt who match a given ICP description.

## CRITICAL CONSTRAINTS
- WebFetch CAN access producthunt.com pages — use it freely.
- Focus on MAKERS (founders who launched products), not just products.

## Search Strategy

### Phase 1: Google search for Product Hunt launches and discussions
1. Search for recent launches by struggling founders:
   - site:producthunt.com "launched" founder "finding customers" OR "first users"
   - site:producthunt.com/discussions "customer acquisition" OR "getting users" OR "no traction"
   - site:producthunt.com "solo founder" OR "indie" OR "bootstrapped" launched 2025 OR 2026
2. Search for Product Hunt discussions specifically:
   - site:producthunt.com/discussions "how to get first customers"
   - site:producthunt.com/discussions "struggling" "users" OR "customers" founder

### Phase 2: Browse Product Hunt directly
3. Fetch and scan these pages:
   - https://www.producthunt.com/discussions (look for founders asking about customer acquisition)
   - https://www.producthunt.com/topics/saas (recent SaaS launches)
   - https://www.producthunt.com/topics/developer-tools (recent dev tool launches)
4. For each promising product page, look at the maker's profile for their bio, social links, and other products.

### Phase 3: Cross-reference founders
5. When you find a maker, search for: "their name" founder OR startup OR "finding customers"
6. Check their personal website (often linked from PH profile) for more context.
7. Look for their presence on Twitter, LinkedIn, and Indie Hackers.

### KEY RULE: Focus on launches with MODERATE engagement (10-200 upvotes) — these are serious founders who haven't gone viral, i.e., still need customers.

""" + SHARED_RULES

DEV_TO_PROMPT = """You are a Dev.to research specialist. Your job is to find real people on Dev.to who match a given ICP description.

## Search Strategy

### Phase 1: Google search with site: filter (works well for Dev.to)
1. site:dev.to "finding customers" OR "first users" founder startup
2. site:dev.to "built" "launched" "no users" OR "no customers" OR "no traction"
3. site:dev.to "technical founder" "customer acquisition" OR "customer discovery"
4. site:dev.to #buildinpublic founder "struggling" OR "difficult"
5. site:dev.to "side project" "launched" "getting users" 2025 OR 2026

### Phase 2: Browse Dev.to directly with WebFetch
6. Fetch and scan tag pages:
   - https://dev.to/t/startup (recent startup posts)
   - https://dev.to/t/buildinpublic (build in public posts)
   - https://dev.to/t/saas (SaaS-related posts)
   - https://dev.to/t/sideproject (side project posts)
7. For promising posts, fetch the full article URL to read the content and author bio.
8. Check author profiles: https://dev.to/{username} — look for bio, social links, company.

### Phase 3: Use Dev.to API (if Google results are thin)
9. Try the Dev.to API:
   - https://dev.to/api/articles?tag=startup&top=30
   - https://dev.to/api/articles?tag=buildinpublic&top=30
10. Extract author usernames and article details from the JSON response.

### Phase 4: Cross-reference
11. When you find a founder, search Google for: "their name" OR "their dev.to username" founder startup
12. Check for Twitter handle and personal website in their Dev.to bio.
13. Also search Product Hunt and Indie Hackers for their product.

""" + SHARED_RULES


ORCHESTRATOR_PROMPT = """You are an ICP research orchestrator. You have received results from 7 platform-specific search agents (Reddit, X/Twitter, LinkedIn, Indie Hackers, Hacker News, Product Hunt, Dev.to).

Your job:
1. Merge all results into a single list.
2. Deduplicate — if the same person appears on multiple platforms, merge into one entry with the best data from each. Prefer the entry with more detail. Combine contact_info from all platforms. Set "platforms_found_on" to a list of ALL platforms they were found on (e.g. ["reddit", "indie_hackers", "x"]). For non-duplicates, set it to a single-element list matching their platform.
3. Re-score relevance (1-10) based on the full picture across platforms. People found on multiple platforms should score higher — it signals stronger signal.
4. Sort by relevance_score descending.
5. Keep the top 15 results (or all if fewer than 15).
6. Write a search_summary covering what was found across all platforms.
7. Write recommendations for improving future searches.

## Output Format
You MUST respond with ONLY a valid JSON object (no markdown, no code fences):

{
  "icp_description": "the original ICP description",
  "search_summary": "summary of findings across all platforms",
  "results": [<merged results using the same per-person schema>],
  "platform_breakdown": {
    "reddit": {"found": N, "notes": "..."},
    "x": {"found": N, "notes": "..."},
    "linkedin": {"found": N, "notes": "..."},
    "indie_hackers": {"found": N, "notes": "..."},
    "hacker_news": {"found": N, "notes": "..."},
    "product_hunt": {"found": N, "notes": "..."},
    "dev_to": {"found": N, "notes": "..."}
  },
  "search_queries_used": ["combined list from all agents"],
  "recommendations": "suggestions for refining ICP or search strategy"
}
"""


def parse_json_response(text: str) -> dict | None:
    """Extract JSON from agent response, handling markdown fences."""
    cleaned = text.strip()
    json_start = cleaned.find("{")
    json_end = cleaned.rfind("}") + 1
    if json_start != -1 and json_end > json_start:
        cleaned = cleaned[json_start:json_end]
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        preview = text[:200] + "..." if len(text) > 200 else text
        logger.warning("Failed to parse JSON from agent response: %s", preview)
        return None


async def search_platform(platform_name: str, system_prompt: str, icp_description: str, monitor: ProgressMonitor | None = None) -> dict:
    """Run a single platform subagent."""
    if monitor:
        monitor.start_platform(platform_name)
    else:
        print(f"  [{platform_name}] Searching...")

    prompt = f"Find people matching this ICP on {platform_name}:\n\n{icp_description}"
    result_text = None

    try:
        async for message in query(
            prompt=prompt,
            options=ClaudeAgentOptions(
                tools=["WebSearch", "WebFetch"],
                system_prompt=system_prompt,
                max_turns=PLATFORM_MAX_TURNS,
                permission_mode="bypassPermissions",
            ),
        ):
            if isinstance(message, ResultMessage) and message.result:
                result_text = message.result
    except Exception as e:
        if monitor:
            monitor.fail_platform(platform_name)
        else:
            print(f"  [{platform_name}] Agent error: {e}")

    if not result_text:
        if monitor:
            monitor.finish_platform(platform_name, 0)
        else:
            print(f"  [{platform_name}] No results returned.")
        return {"platform": platform_name, "results": [], "search_queries_used": [], "platform_notes": "Agent returned no output."}

    parsed = parse_json_response(result_text)
    if not parsed:
        if not monitor:
            print(f"  [{platform_name}] Warning: Could not parse JSON. Raw output saved.")
        output_dir = SCRIPT_DIR / "output"
        output_dir.mkdir(parents=True, exist_ok=True)
        (output_dir / f"raw_{platform_name}.txt").write_text(result_text)
        if monitor:
            monitor.finish_platform(platform_name, 0)
        return {"platform": platform_name, "results": [], "search_queries_used": [], "platform_notes": "JSON parse failed — see raw output file."}

    count = len(parsed.get("results", []))
    if monitor:
        monitor.finish_platform(platform_name, count)
    else:
        print(f"  [{platform_name}] Found {count} matches.")
    return parsed


async def merge_results(icp_description: str, platform_results: list[dict], monitor: ProgressMonitor | None = None) -> dict:
    """Use an orchestrator agent to merge and deduplicate results."""
    if monitor:
        monitor.start_merge()
    else:
        print("\n  [orchestrator] Merging and deduplicating results...")

    combined_input = f"ICP Description: {icp_description}\n\n"
    for pr in platform_results:
        combined_input += f"--- Results from {pr.get('platform', 'unknown')} ---\n"
        combined_input += json.dumps(pr, indent=2) + "\n\n"

    result_text = None
    try:
        async for message in query(
            prompt=combined_input,
            options=ClaudeAgentOptions(
                system_prompt=ORCHESTRATOR_PROMPT,
                max_turns=ORCHESTRATOR_MAX_TURNS,
                permission_mode="bypassPermissions",
            ),
        ):
            if isinstance(message, ResultMessage) and message.result:
                result_text = message.result
    except Exception as e:
        print(f"  [orchestrator] Agent error: {e}")

    if not result_text:
        # Fallback: just concatenate all results
        print("  [orchestrator] Warning: merge agent returned nothing. Using raw concatenation.")
        all_results = []
        for pr in platform_results:
            all_results.extend(pr.get("results", []))
        return {
            "icp_description": icp_description,
            "search_summary": "Merged without orchestrator (fallback).",
            "results": all_results,
            "search_queries_used": [],
            "recommendations": "",
        }

    parsed = parse_json_response(result_text)
    if parsed:
        return parsed

    # Fallback
    fallback_dir = SCRIPT_DIR / "output"
    fallback_dir.mkdir(parents=True, exist_ok=True)
    (fallback_dir / "raw_orchestrator.txt").write_text(result_text)
    all_results = []
    for pr in platform_results:
        all_results.extend(pr.get("results", []))
    return {
        "icp_description": icp_description,
        "search_summary": "Orchestrator JSON parse failed — raw concatenation used.",
        "results": all_results,
        "search_queries_used": [],
        "recommendations": "",
    }


async def find_icps(icp_description: str, output_dir: str | None = None) -> dict:
    """Run platform subagents sequentially, then merge results."""

    resolved_output_dir = AsyncPath(output_dir) if output_dir else AsyncPath(SCRIPT_DIR / "output")

    platforms = [
        ("Reddit", REDDIT_PROMPT),
        ("X/Twitter", X_PROMPT),
        ("LinkedIn", LINKEDIN_PROMPT),
        ("Indie Hackers", INDIE_HACKERS_PROMPT),
        ("Hacker News", HACKER_NEWS_PROMPT),
        ("Product Hunt", PRODUCT_HUNT_PROMPT),
        ("Dev.to", DEV_TO_PROMPT),
    ]

    monitor = ProgressMonitor([name for name, _ in platforms])
    print(f"\n  Searching for ICPs across {len(platforms)} platforms\n")
    monitor.render()

    # Run platform agents sequentially (SDK has concurrency limits)
    platform_results: list[dict] = []
    for name, prompt in platforms:
        try:
            result = await search_platform(name, prompt, icp_description, monitor=monitor)
            platform_results.append(result)
        except Exception as e:
            monitor.fail_platform(name)
            platform_results.append({"platform": name, "results": [], "search_queries_used": [], "platform_notes": f"Agent failed: {e}"})

    # Merge results
    merged = await merge_results(icp_description, [r for r in platform_results if r], monitor=monitor)

    # Save output
    await resolved_output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d")
    output_file = resolved_output_dir / f"icps_{timestamp}.json"
    await output_file.write_text(json.dumps(merged, indent=2))

    print_summary(merged, str(output_file))
    return merged


def print_summary(results: dict, output_file: str):
    """Print a human-readable summary to console."""
    print("\n" + "=" * 60)
    print("ICP FINDER RESULTS")
    print("=" * 60)

    if "search_summary" in results:
        print(f"\n{results['search_summary']}\n")

    # Platform breakdown
    breakdown = results.get("platform_breakdown", {})
    if breakdown:
        print("Platform breakdown:")
        for platform, info in breakdown.items():
            found = info.get("found", "?")
            notes = info.get("notes", "")
            print(f"  {platform}: {found} found — {notes}")
        print()

    people = results.get("results", [])
    print(f"Total matches: {len(people)}\n")

    for i, person in enumerate(people, 1):
        score = person.get("relevance_score", "?")
        name = person.get("name", "Unknown")
        platform = person.get("platform", "?")
        role = person.get("title_role", "Unknown role")
        evidence = person.get("match_evidence", "")
        url = person.get("profile_url", "")
        date = person.get("evidence_date", "")
        company = person.get("company", "")
        industry = person.get("industry", "")
        contact = person.get("contact_info", {})

        platforms_found = person.get("platforms_found_on", [platform])
        platform_display = ", ".join(platforms_found) if isinstance(platforms_found, list) else platform
        print(f"  {i}. [{score}/10] {name} ({platform_display})")
        print(f"     Role: {role}")
        if company:
            print(f"     Company: {company} | Industry: {industry}")
        ev_str = str(evidence or "")
        ev = ev_str[:120] + "..." if len(ev_str) > 120 else ev_str
        print(f"     Why:  {ev}")
        if date:
            print(f"     Date: {date}")
        if url:
            print(f"     URL:  {url}")
        contact_parts = [f"{k}: {v}" for k, v in (contact or {}).items() if v]
        if contact_parts:
            print(f"     Contact: {', '.join(contact_parts)}")
        print()

    if "recommendations" in results:
        recs = results["recommendations"]
        print(f"Recommendations: {recs[:300]}{'...' if len(str(recs)) > 300 else ''}\n")

    print(f"Full results saved to: {output_file}")
    print("=" * 60)


async def main():
    if len(sys.argv) > 1:
        icp_description = " ".join(sys.argv[1:])
    else:
        icp_description = input("Describe your ICP: ")

    if not icp_description.strip():
        print("Error: Please provide an ICP description.")
        sys.exit(1)

    await find_icps(icp_description)


if __name__ == "__main__":
    anyio.run(main)
