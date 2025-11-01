# Knowledge Base - UI/UX Examples & Mockups

## 🎨 Visual Design Examples

### Color Palette

```css
/* Light Mode */
--kb-user-message: #3b82f6; /* Blue */
--kb-assistant: #8b5cf6; /* Purple */
--kb-source-bg: #f3f4f6; /* Gray-100 */
--kb-filter-active: #10b981; /* Green */

/* Dark Mode */
--kb-user-message: #60a5fa;
--kb-assistant: #a78bfa;
--kb-source-bg: #1f2937;
--kb-filter-active: #34d399;
```

---

## 📱 Screen States

### 1. Empty State (First Visit)

```
┌────────────────────────────────────────────────────────┐
│                    Knowledge Base                    🌙│
├────────────────────────────────────────────────────────┤
│                                                        │
│                          🤖                            │
│                                                        │
│              Ask me anything about                     │
│               your meetings                            │
│                                                        │
│     I can help you find information from:              │
│     • Meeting transcripts                              │
│     • AI-generated summaries                           │
│     • Action items and decisions                       │
│     • Key topics and discussions                       │
│                                                        │
│                                                        │
│     Try asking:                                        │
│     ┌──────────────────────────────────────┐          │
│     │ "What were the main action items     │          │
│     │  from last week's marketing meeting?"│          │
│     └──────────────────────────────────────┘          │
│                                                        │
│     ┌──────────────────────────────────────┐          │
│     │ "Show me all decisions about the     │          │
│     │  Q3 budget"                          │          │
│     └──────────────────────────────────────┘          │
│                                                        │
├────────────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────┐  ┌────┐     │
│ │ Type your question...                │  │📤 │     │
│ └──────────────────────────────────────┘  └────┘     │
└────────────────────────────────────────────────────────┘
```

### 2. Active Conversation

```
┌─────────────┬──────────────────────────────────────────┐
│             │     Knowledge Base      🔔 👤           │
│  Filters    ├──────────────────────────────────────────┤
│             │                                          │
│ Projects    │  🤖 AI Assistant                         │
│ ✓ Marketing │  ┌────────────────────────────────────┐ │
│ ✓ Product   │  │ Based on your meetings, here are   │ │
│ □ Sales     │  │ the action items from last week:   │ │
│             │  │                                    │ │
│ Tags        │  │ 1. Update pricing page (Sarah)     │ │
│ ✓ Q3-2025   │  │ 2. Schedule follow-up call (Mike)  │ │
│ ✓ sprint    │  │ 3. Review designs (Team)           │ │
│ □ urgent    │  └────────────────────────────────────┘ │
│             │  Sources:                                │
│ Date Range  │  [Marketing Q3 📄] [Sprint Review 📄]    │
│ From: 10/01 │                          10:23 AM        │
│ To: 10/31   │                                          │
│             │  ─────────────────────────────────────   │
│ [Clear]     │                                          │
│             │                            👤 You        │
│ ─────────   │                  ┌──────────────────┐   │
│             │                  │ What were the    │   │
│ Recent      │                  │ action items?    │   │
│ Chats       │                  └──────────────────┘   │
│             │                          10:23 AM        │
│ ▶ Q3 Actions│                                          │
│   Budget    │                                          │
│   Sprint 5  │                                          │
│             │                                          │
├─────────────┼──────────────────────────────────────────┤
│  [+ New]    │ ┌──────────────────────────┐  ┌──────┐ │
│             │ │ Ask a follow-up...       │  │ 📤  │ │
│             │ └──────────────────────────┘  └──────┘ │
└─────────────┴──────────────────────────────────────────┘
```

### 3. Streaming Response

```
│  🤖 AI Assistant                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │ The sprint retrospective revealed three key     │  │
│  │ areas for improvement:                          │  │
│  │                                                 │  │
│  │ 1. Communication: The team felt...▊            │  │
│  │                                                 │  │
│  └─────────────────────────────────────────────────┘  │
│  ⏳ Searching meetings...                              │
```

### 4. With Sources Expanded

```
│  🤖 AI Assistant                                        │
│  ┌─────────────────────────────────────────────────┐  │
│  │ Here's what I found about budget decisions:     │  │
│  │                                                 │  │
│  │ • Approved: $50k for marketing campaign        │  │
│  │ • Deferred: New hire until Q4                  │  │
│  │ • Under review: Office expansion               │  │
│  └─────────────────────────────────────────────────┘  │
│                                                        │
│  Sources (3):                                          │
│  ┌──────────────────────────────────────┐             │
│  │ 📄 Budget Planning Meeting           │ 🔗          │
│  │ 📅 Oct 15, 2025 • Decision • 95%     │             │
│  │ "We approved the $50k marketing..."  │             │
│  └──────────────────────────────────────┘             │
│                                                        │
│  ┌──────────────────────────────────────┐             │
│  │ 📄 Q3 Strategy Review                │ 🔗          │
│  │ 📅 Oct 10, 2025 • Summary • 87%      │             │
│  │ "Hiring decision postponed to Q4..." │             │
│  └──────────────────────────────────────┘             │
│                                                        │
│  ┌──────────────────────────────────────┐             │
│  │ 📄 Executive Sync                    │ 🔗          │
│  │ 📅 Oct 5, 2025 • Transcription • 78% │             │
│  │ "The office expansion is still..."   │             │
│  └──────────────────────────────────────┘             │
```

### 5. Mobile View (Responsive)

```
┌────────────────────────────┐
│  ≡  Knowledge Base      👤│
├────────────────────────────┤
│                            │
│  🤖                        │
│  ┌──────────────────────┐ │
│  │ Here are the action  │ │
│  │ items from last      │ │
│  │ week's meeting:      │ │
│  │                      │ │
│  │ 1. Update pricing    │ │
│  │ 2. Schedule call     │ │
│  └──────────────────────┘ │
│  [📄 Marketing] [📄 Sales]│
│                            │
│  ──────────────────────    │
│                            │
│                         👤 │
│           ┌─────────────┐  │
│           │ What were   │  │
│           │ the action  │  │
│           │ items?      │  │
│           └─────────────┘  │
│                            │
├────────────────────────────┤
│ ┌────────────────┐  ┌───┐ │
│ │ Ask...         │  │📤│ │
│ └────────────────┘  └───┘ │
└────────────────────────────┘
```

---

## 🎭 Interaction Examples

### Example 1: Finding Action Items

**User Query:**

> "What are all the action items assigned to Sarah from the marketing meetings?"

**System Process:**

1. Parse query → Identify: `action_items` + `Sarah` + `marketing`
2. Apply filters: `content_type=action_item` + `tags=marketing`
3. Hybrid search in Elasticsearch
4. Rank by relevance
5. Generate answer with RAG

**Assistant Response:**

> Based on marketing meetings, Sarah has 3 action items:
>
> 1. **Update pricing page** (Due: Oct 25)
>
>    - From: Q3 Marketing Strategy Meeting
>    - Priority: High
>
> 2. **Prepare competitor analysis** (Due: Oct 30)
>
>    - From: Campaign Planning Session
>    - Priority: Medium
>
> 3. **Review ad copy** (Due: Nov 2)
>    - From: Content Review Meeting
>    - Priority: Low
>
> **Sources:** [3 meetings found]

### Example 2: Complex Query with Context

**User Query:**

> "We discussed changing vendors last month. What were the reasons and what did we decide?"

**System Process:**

1. Temporal filter: `last month`
2. Semantic search: `changing vendors` + `reasons` + `decision`
3. Search `decisions_made` + `key_topics` + `transcription`
4. Build chronological context

**Assistant Response:**

> The vendor change discussion happened across 2 meetings in October:
>
> **Reasons for changing:**
>
> - Current vendor response time issues (mentioned 3 times)
> - 20% cost increase announced
> - Lack of technical support
>
> **Decision:**
> On Oct 18, the team decided to:
> ✅ Switch to Vendor B by Nov 15
> ✅ John to negotiate contract
> ⏸️ Keep current vendor as backup for 3 months
>
> **Sources:** [Oct 10 Tech Review] [Oct 18 Executive Decision]

### Example 3: No Results Found

**User Query:**

> "What's our social media strategy for Christmas campaign?"

**Assistant Response:**

> 🔍 I couldn't find information about "Christmas campaign social media strategy" in your meetings.
>
> However, I found related topics:
>
> - Q3 Social Media Planning (Oct 5)
> - Holiday Marketing Budget (Sep 20)
>
> Would you like me to search for:
>
> - "holiday campaign plans"
> - "social media Q4 strategy"
> - "marketing campaigns December"

---

## 🎯 Filter UI Examples

### Collapsed Filters (Default)

```
┌─────────────────┐
│  🎛️ Filters (2) │
├─────────────────┤
│                 │
│  ✓ Marketing    │
│  ✓ Q3-2025      │
│                 │
│  [Edit Filters] │
└─────────────────┘
```

### Expanded Filters Panel

```
┌──────────────────────────┐
│  Filters        [Clear]  │
├──────────────────────────┤
│                          │
│  📁 Projects (3/5)       │
│  ┌────────────────────┐  │
│  │ ☑ Marketing        │  │
│  │ ☑ Product Dev      │  │
│  │ ☑ Sales            │  │
│  │ ☐ HR               │  │
│  │ ☐ Operations       │  │
│  └────────────────────┘  │
│                          │
│  🏷️ Tags (2/10)          │
│  ┌────────────────────┐  │
│  │ ☑ Q3-2025          │  │
│  │ ☑ sprint           │  │
│  │ ☐ urgent           │  │
│  │ ☐ review           │  │
│  │ [+2 more]          │  │
│  └────────────────────┘  │
│                          │
│  📅 Date Range           │
│  From: [Oct 1, 2025]▼   │
│  To:   [Oct 31, 2025]▼  │
│                          │
│  [Apply] [Reset]         │
└──────────────────────────┘
```

### Active Filters Badge Bar

```
┌──────────────────────────────────────────┐
│  Active Filters (3):                     │
│  [Marketing ×] [Q3-2025 ×] [Oct 2025 ×] │
│                          [Clear All]     │
└──────────────────────────────────────────┘
```

---

## 🎪 Animation & Transitions

### Message Streaming Animation

```typescript
// Typewriter effect with cursor
"Here are the action items▊"
"Here are the action items from▊"
"Here are the action items from last week:▊"

// CSS
@keyframes blink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.cursor {
  animation: blink 1s infinite;
}
```

### Source Card Hover Effect

```css
.source-card {
  transition: all 0.2s ease;
  transform: translateY(0);
}

.source-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: var(--primary);
}
```

### Filter Apply Animation

```css
.filter-badge {
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateX(-20px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

---

## 🎨 Message Bubble Styles

### User Message

```tsx
<div className="flex justify-end mb-4">
  <div className="max-w-[70%] bg-primary text-primary-foreground rounded-2xl rounded-tr-sm px-4 py-3 shadow-sm">
    <p className="text-sm">What were the action items from last week?</p>
    <span className="text-xs opacity-75 mt-1 block">10:23 AM</span>
  </div>
</div>
```

### Assistant Message with Sources

```tsx
<div className="flex gap-3 mb-4">
  <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center flex-shrink-0">
    <Bot className="w-4 h-4 text-white" />
  </div>
  <div className="flex-1">
    <div className="bg-card border rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
      <p className="text-sm prose">Here are the action items...</p>
    </div>
    <div className="flex flex-wrap gap-2 mt-2">
      <Badge variant="outline" className="text-xs">
        📄 Marketing Meeting
      </Badge>
      <Badge variant="outline" className="text-xs">
        📄 Sprint Review
      </Badge>
    </div>
    <span className="text-xs text-muted-foreground mt-1 block">10:23 AM</span>
  </div>
</div>
```

---

## 📊 Data Visualization in Responses

### Timeline View for Decisions

```
Assistant Response:

Here's the timeline of budget decisions:

Oct 5  ────●─────  Initial proposal ($75k)
           │
Oct 10 ────●─────  Revised to $60k
           │
Oct 15 ────●─────  Approved at $50k ✓
           │
Oct 20 ────●─────  Implementation started
```

### Progress Indicators

```
Action Items Status:

✅ Completed: 12 ███████████░░░░░ 65%
⏳ In Progress: 5 ███░░░░░░░░░░░░ 27%
⭕ Pending: 3 ██░░░░░░░░░░░░░░ 8%
```

### Tag Cloud for Topics

```
Key Topics Discussed:

    Budget        Marketing
  █████████       ███████

    Design         Sprint
   ██████         ████████

   Hiring         Launch
    ███            █████
```

---

## 🎯 Keyboard Shortcuts

```
┌────────────────────────────────────┐
│  Keyboard Shortcuts        [Close] │
├────────────────────────────────────┤
│                                    │
│  Navigation:                       │
│  Ctrl+K      Focus search input    │
│  Ctrl+N      New conversation      │
│  ↑/↓         Navigate messages     │
│  Esc         Clear input           │
│                                    │
│  Actions:                          │
│  Enter       Send message          │
│  Shift+Enter New line              │
│  Ctrl+/      Toggle shortcuts      │
│                                    │
│  Filters:                          │
│  Ctrl+F      Open filters          │
│  Ctrl+R      Clear filters         │
│                                    │
└────────────────────────────────────┘
```

---

## 🎭 Error States

### Network Error

```
┌────────────────────────────────────┐
│  ⚠️ Connection Lost                │
│                                    │
│  Couldn't reach the server.        │
│  Your message will be sent once    │
│  connection is restored.           │
│                                    │
│  [Retry Now] [Dismiss]             │
└────────────────────────────────────┘
```

### No Meetings Found

```
┌────────────────────────────────────┐
│  📭 No Meetings Yet                │
│                                    │
│  You don't have any meetings       │
│  to search through.                │
│                                    │
│  [Upload First Meeting]            │
└────────────────────────────────────┘
```

### Search Error

```
┌────────────────────────────────────┐
│  🤖 Hmm, something went wrong      │
│                                    │
│  I couldn't process your question. │
│  Please try rephrasing or check    │
│  your filters.                     │
│                                    │
│  Error: Search timeout (code: 504) │
│                                    │
│  [Try Again]                       │
└────────────────────────────────────┘
```

---

## 🎨 Accessibility Features

### ARIA Labels

```tsx
<button
  aria-label="Send message"
  aria-disabled={isStreaming}
>
  <Send />
</button>

<div
  role="log"
  aria-live="polite"
  aria-relevant="additions"
>
  {messages.map(msg => <Message key={msg.id} {...msg} />)}
</div>

<input
  aria-label="Search your meetings"
  aria-describedby="search-hint"
  aria-autocomplete="list"
/>
```

### Focus Management

```typescript
// Focus on input after sending message
const inputRef = useRef<HTMLTextAreaElement>(null);

const handleSend = () => {
  sendMessage(input);
  setInput("");
  inputRef.current?.focus();
};
```

### Screen Reader Announcements

```tsx
<div role="status" aria-live="polite" className="sr-only">
  {isStreaming ? "AI is typing..." : "Message sent"}
</div>
```

---

## 📱 Progressive Disclosure

### Level 1: Quick Answer

```
Q: "What were the action items?"
A: "3 action items found. See details ↓"
```

### Level 2: Summary

```
1. Update pricing (Sarah)
2. Schedule call (Mike)
3. Review designs (Team)

[Show Full Details]
```

### Level 3: Full Context

```
1. Update pricing (Sarah)
   - Meeting: Marketing Q3
   - Due: Oct 25
   - Priority: High
   - Context: "We need to update..."
   [View Meeting →]
```

---

## 🎯 Smart Suggestions

### Auto-complete Examples

```
As user types: "What were the..."

Suggestions:
┌──────────────────────────────────┐
│ "What were the action items"     │
│ "What were the decisions made"   │
│ "What were the key topics"       │
└──────────────────────────────────┘
```

### Related Questions

```
After answering, show:

💡 Related questions you might ask:
• "Who is responsible for these items?"
• "What's the deadline for each?"
• "Are there any blockers mentioned?"
```

---

## 🎨 Theme Variations

### Light Mode

- Clean white backgrounds
- Soft shadows
- Blue accents for user
- Purple accents for AI

### Dark Mode

- Dark gray backgrounds
- Subtle borders
- Brighter blue for user
- Softer purple for AI

### High Contrast Mode

- Bold borders
- Clear separation
- Strong color contrast
- Larger text

---

## 📊 Loading States

### Initial Load

```
┌────────────────────────────────┐
│  🔄 Loading Knowledge Base...  │
│  ▓▓▓▓▓▓▓▓▓░░░░░░░░ 60%        │
└────────────────────────────────┘
```

### Searching

```
┌────────────────────────────────┐
│  🔍 Searching through 47       │
│     meetings...                │
│  ▓▓▓▓▓▓░░░░░░░░░░░             │
└────────────────────────────────┘
```

### Streaming

```
┌────────────────────────────────┐
│  🤖 Generating response...     │
│  ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░            │
└────────────────────────────────┘
```

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-01  
**Companion to**: KNOWLEDGE_BASE_SPEC.md
