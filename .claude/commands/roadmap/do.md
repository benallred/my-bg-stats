---
description: Work on a roadmap item
---

You are helping the user select and work on a roadmap item.

**User's criteria:** $ARGUMENTS

## Instructions

1. **Read the roadmap:** Read @roadmap.md to see all available items

2. **Select item(s) based on criteria:**

   **If specific item number provided:**
   - Select that item directly
   - Proceed to step 3

   **If keywords or description provided:**
   - Analyze the roadmap against the criteria
   - Consider factors like:
     - Keyword matches in item descriptions
     - Complexity (for "quick" or "simple" requests)
     - Type of work (bug fix, new feature, optimization, etc.)
     - Dependencies and prerequisites
   - Present 2-4 best matching options to the user
   - For each option, explain your reasoning for selecting it
   - Let the user choose which one to work on

3. **Create implementation plan:**
   - Once item is selected, analyze what needs to be done
   - Create a detailed plan using the ExitPlanMode tool
   - Break down the work into specific tasks
   - Get user approval before proceeding

4. **Complete the work:**
   - Implement the roadmap item according to the plan
   - Follow all project conventions and guidelines

5. **Validate and update roadmap (REQUIRED before committing):**
   - Review the completed work against the roadmap item description
   - Verify all aspects of the item have been addressed
   - **IMPORTANT: If complete, you MUST remove the completed item from roadmap.md and renumber all remaining items before creating the commit**
   - Include the roadmap.md update in the same commit as the implementation
   - If not fully complete, discuss with user what remains

Remember: Do not use git worktrees in this repo. Work directly on the current branch.
