# Knowledge Base Testing Guide

## Quick Start Testing

### 1. Start Development Environment

```bash
# Start all backend services (MongoDB, Elasticsearch, Ollama, Redis, Backend, Celery)
docker-compose -f docker-compose.dev.yml up

# In separate terminal, start frontend
cd frontend
pnpm install
pnpm run dev
```

**Frontend URL**: http://localhost:5173  
**Backend URL**: http://localhost:8000  
**API Docs**: http://localhost:8000/docs

### 2. Prerequisites

**Required Test Data:**

- At least one user account (register at /register)
- At least one project (create at /projects)
- At least 2-3 meetings with:
  - ✅ Status: COMPLETED
  - ✅ Has transcription
  - ✅ Has AI analysis (title, summary, key_points, action_items, decisions)

**Why?** The Knowledge Base requires indexed meeting content. Meetings are automatically indexed when:

- Meeting is marked as COMPLETED
- Has transcription or AI analysis
- Auto-indexing happens asynchronously via Celery

**Check if meetings are indexed:**

```bash
# Via API Docs (http://localhost:8000/docs)
# - GET /api/v1/knowledge-base/admin/stats
# - Should show total_documents > 0 and total_meetings > 0

# Or via curl
curl -X GET "http://localhost:8000/api/v1/knowledge-base/admin/stats" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Test Scenarios

### Scenario 1: First Time User Experience

**Goal**: Test empty state and conversation creation

1. Login to application
2. Navigate to "Knowledge Base" in top navigation
3. **Expected**: Empty sidebar with "No conversations yet"
4. **Expected**: Main area shows welcome message with Sparkles icon
5. Click "New Chat" button
6. **Expected**: New conversation created and selected
7. **Expected**: Empty chat area with prompt text

**Validation:**

- [ ] Navigation link visible and clickable
- [ ] Empty states display correctly
- [ ] New conversation button works
- [ ] No console errors

---

### Scenario 2: Basic Question & Answer

**Goal**: Test simple Q&A flow with source citations

**Setup**: Ensure at least 1 meeting indexed (check admin stats)

**Steps:**

1. Create new conversation (or use existing)
2. Type question: "What meetings have we had?"
3. Click Send button (or press Enter)
4. **Expected**:
   - User message appears immediately (optimistic update)
   - Loading spinner shows on Send button
   - Assistant response appears after 2-5 seconds
   - Source citations shown below response (up to 3)
5. Review source citations
6. **Expected**: Each source shows:
   - Meeting title
   - Content type (e.g., "summary", "key_points")
   - Relevance score (0-100%)

**Test Questions:**

- "What meetings have we had?"
- "Summarize the key decisions from our last meeting"
- "What action items were assigned to [Name]?"
- "Tell me about the [Project Name] discussions"
- "What were the main topics in recent meetings?"

**Validation:**

- [ ] User message appears instantly
- [ ] Loading state shows during API call
- [ ] Assistant response formatted correctly
- [ ] Sources displayed with proper metadata
- [ ] Messages auto-scroll to bottom
- [ ] No duplicate messages

---

### Scenario 3: Multi-Turn Conversation

**Goal**: Test conversation context and history

**Steps:**

1. Start new conversation
2. Ask: "What meetings did we have last week?"
3. Wait for response
4. Follow-up: "What were the key decisions?"
5. Follow-up: "Who was assigned action items?"
6. **Expected**: Each response builds on previous context
7. Refresh page
8. **Expected**: Conversation history persists

**Validation:**

- [ ] Multiple messages display in chronological order
- [ ] Context maintained across messages
- [ ] History loads after page refresh
- [ ] Auto-scroll works for new messages
- [ ] Messages grouped correctly (user vs assistant)

---

### Scenario 4: Conversation Management

**Goal**: Test switching between conversations

**Steps:**

1. Create 3 new conversations
2. Send different questions in each:
   - Conv 1: "What are our project goals?"
   - Conv 2: "What action items are pending?"
   - Conv 3: "Summarize recent decisions"
3. Wait for all responses
4. Click between conversations in sidebar
5. **Expected**: Correct messages load for each
6. **Expected**: Selected conversation highlighted
7. **Expected**: Conversation titles update based on first message

**Validation:**

- [ ] Sidebar shows all conversations
- [ ] Conversation count accurate
- [ ] Switching conversations loads correct messages
- [ ] Selected state highlighted
- [ ] No message mixing between conversations

---

### Scenario 5: Error Handling

**Goal**: Test graceful error handling

**Test A: Network Error**

1. Start conversation and send message
2. Stop backend: `docker-compose -f docker-compose.dev.yml stop backend`
3. Try to send another message
4. **Expected**: Toast error: "Failed to send message"
5. **Expected**: Message not added to UI
6. Restart backend
7. **Expected**: Next message works

**Test B: Empty Input**

1. Try to send empty message (just spaces)
2. **Expected**: Send button disabled
3. **Expected**: No API call made

**Test C: Authentication Error**

1. Delete auth token from localStorage
2. Refresh page
3. **Expected**: Redirect to login OR "Please log in" message

**Validation:**

- [ ] Toast notifications show for errors
- [ ] Console logs errors (for debugging)
- [ ] UI doesn't break on error
- [ ] Recovery works after error
- [ ] No sensitive data in error messages

---

### Scenario 6: Loading States

**Goal**: Test all loading indicators

**Steps:**

1. Clear browser cache
2. Navigate to /knowledge-base
3. **Expected**: Spinner in conversation sidebar while loading
4. Wait for conversations to load
5. Click conversation
6. **Expected**: No spinner (messages load fast)
7. Send message
8. **Expected**: Loading spinner on Send button
9. **Expected**: Button disabled during load

**Validation:**

- [ ] Loading spinner shows for conversations
- [ ] Loading spinner shows during message send
- [ ] No "flash of empty content"
- [ ] Smooth transitions

---

### Scenario 7: Responsive Design

**Goal**: Test mobile and tablet layouts

**Steps:**

1. Open Chrome DevTools (F12)
2. Toggle device toolbar (Ctrl+Shift+M)
3. Test these viewports:
   - iPhone SE (375px)
   - iPad (768px)
   - Desktop (1280px)
4. Check:
   - Sidebar visibility
   - Message wrapping
   - Button sizes
   - Input field responsiveness

**Validation:**

- [ ] Sidebar responsive (hidden on mobile?)
- [ ] Messages wrap properly
- [ ] Touch targets adequate size (44px+)
- [ ] No horizontal scroll
- [ ] Text readable at all sizes

---

### Scenario 8: Performance

**Goal**: Test with realistic data volumes

**Setup:**

- Create 10+ conversations
- Each with 20+ messages

**Steps:**

1. Navigate to /knowledge-base
2. **Expected**: Conversations load in < 1s
3. Select conversation with many messages
4. **Expected**: Messages load in < 1s
5. Scroll through message history
6. **Expected**: Smooth scrolling
7. Send new message
8. **Expected**: Response in 2-5s

**Validation:**

- [ ] Initial load fast
- [ ] No lag when switching conversations
- [ ] Smooth scrolling
- [ ] No memory leaks (check DevTools Performance)

---

## Backend Integration Tests

### Test 1: Verify Elasticsearch Connection

```bash
# Check Elasticsearch health
curl http://localhost:9200/_cluster/health

# Expected: {"status":"yellow" or "green"}
```

### Test 2: Verify Ollama Model

```bash
# Check Ollama is running
curl http://localhost:11434/api/tags

# Expected: List of models including llama3.2:3b-instruct-fp16
```

### Test 3: Test Backend Endpoints Directly

```bash
# Get access token (from login response or browser DevTools)
TOKEN="your_access_token_here"

# List conversations
curl -X GET "http://localhost:8000/api/v1/knowledge-base/conversations" \
  -H "Authorization: Bearer $TOKEN"

# Create conversation
curl -X POST "http://localhost:8000/api/v1/knowledge-base/conversations" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json"

# Send message
curl -X POST "http://localhost:8000/api/v1/knowledge-base/chat" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What meetings have we had?",
    "conversation_id": "YOUR_CONVERSATION_ID"
  }'

# Get index stats
curl -X GET "http://localhost:8000/api/v1/knowledge-base/admin/stats" \
  -H "Authorization: Bearer $TOKEN"
```

---

## Common Issues & Solutions

### Issue 1: No Search Results

**Symptoms**: Assistant responds with "I couldn't find any information..."

**Causes:**

- No meetings indexed yet
- Meetings don't have transcription/analysis
- Elasticsearch not running

**Solution:**

```bash
# Check index stats
curl -X GET "http://localhost:8000/api/v1/knowledge-base/admin/stats" \
  -H "Authorization: Bearer $TOKEN"

# If total_documents = 0, manually reindex
curl -X POST "http://localhost:8000/api/v1/knowledge-base/admin/reindex-all" \
  -H "Authorization: Bearer $TOKEN"
```

### Issue 2: Slow Responses

**Symptoms**: Message takes 30+ seconds to respond

**Causes:**

- Ollama model not loaded
- Elasticsearch slow query
- Backend overloaded

**Solution:**

```bash
# Check Ollama logs
docker-compose -f docker-compose.dev.yml logs ollama

# Check backend logs
docker-compose -f docker-compose.dev.yml logs backend

# Restart services
docker-compose -f docker-compose.dev.yml restart
```

### Issue 3: Conversations Not Persisting

**Symptoms**: Conversations disappear after refresh

**Causes:**

- MongoDB not running
- Backend not saving to DB

**Solution:**

```bash
# Check MongoDB
docker-compose -f docker-compose.dev.yml ps mongo

# Check backend logs for errors
docker-compose -f docker-compose.dev.yml logs backend | grep -i "error"
```

### Issue 4: CORS Errors

**Symptoms**: Network errors in browser console

**Causes:**

- Frontend/backend URL mismatch
- CORS not configured

**Solution:**

```bash
# Check environment variables
cd frontend
cat .env

# Should have:
# VITE_BACKEND_API_BASE_URL=http://localhost:8000

# Restart frontend
pnpm run dev
```

---

## Automated Test Suite (Future Work)

### Unit Tests

```typescript
// tests/services/knowledge-base.test.ts
describe('knowledge-base service', () => {
  test('getConversations returns array', async () => {
    const convs = await getConversations('fake-token');
    expect(Array.isArray(convs)).toBe(true);
  });

  test('sendMessage throws on network error', async () => {
    // Mock fetch to fail
    await expect(sendMessage('token', {...})).rejects.toThrow();
  });
});
```

### Integration Tests

```typescript
// tests/pages/KnowledgeBasePage.test.tsx
describe("KnowledgeBasePage", () => {
  test("loads conversations on mount", async () => {
    render(<KnowledgeBasePage />);
    await waitFor(() => {
      expect(screen.getByText(/conversation/i)).toBeInTheDocument();
    });
  });

  test("sends message and displays response", async () => {
    render(<KnowledgeBasePage />);
    const input = screen.getByPlaceholderText(/ask a question/i);
    fireEvent.change(input, { target: { value: "Test question" } });
    fireEvent.submit(input.closest("form"));

    await waitFor(() => {
      expect(screen.getByText(/Test question/i)).toBeInTheDocument();
    });
  });
});
```

### E2E Tests (Playwright/Cypress)

```typescript
// e2e/knowledge-base.spec.ts
test("complete knowledge base flow", async ({ page }) => {
  // Login
  await page.goto("/login");
  await page.fill('[name="username"]', "testuser");
  await page.fill('[name="password"]', "password");
  await page.click('button[type="submit"]');

  // Navigate to Knowledge Base
  await page.click("text=Knowledge Base");
  await expect(page).toHaveURL("/knowledge-base");

  // Create conversation and send message
  await page.click("text=New Chat");
  await page.fill('[placeholder*="Ask a question"]', "What meetings?");
  await page.click('button[type="submit"]');

  // Wait for response
  await expect(page.locator("text=/meeting/i")).toBeVisible({ timeout: 10000 });
});
```

---

## Performance Benchmarks

### Target Metrics

- **Initial Page Load**: < 1 second
- **Conversation List Load**: < 500ms
- **Message History Load**: < 500ms
- **Send Message Response**: 2-5 seconds
- **Switch Conversation**: < 200ms

### Monitoring

```javascript
// Add to KnowledgeBasePage.tsx
useEffect(() => {
  const startTime = performance.now();
  loadConversations().then(() => {
    const duration = performance.now() - startTime;
    log.info(`Conversations loaded in ${duration}ms`);
  });
}, []);
```

---

## Accessibility Checklist

- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Screen reader announces new messages
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG AA standards
- [ ] Alt text for icons
- [ ] ARIA labels on interactive elements
- [ ] Form inputs have labels
- [ ] Error messages announced to screen readers

---

## Security Checklist

- [ ] Authentication required for all operations
- [ ] Token stored securely (httpOnly cookies preferred)
- [ ] XSS protection (React auto-escapes)
- [ ] CSRF protection
- [ ] Rate limiting on API
- [ ] Input validation on backend
- [ ] No sensitive data in logs
- [ ] HTTPS in production

---

## Pre-Production Checklist

### Code Quality

- [x] No lint errors in KB files
- [x] TypeScript strict mode passes
- [x] All functions properly typed
- [x] Error handling comprehensive
- [x] Loading states implemented

### Functionality

- [ ] All test scenarios pass
- [ ] Edge cases handled
- [ ] Mobile responsive
- [ ] Cross-browser tested
- [ ] Performance acceptable

### Documentation

- [x] Phase 7 summary complete
- [x] Testing guide complete
- [ ] User documentation
- [ ] API documentation updated

### Deployment

- [ ] Environment variables set
- [ ] Build process tested
- [ ] Docker compose works
- [ ] Monitoring configured
- [ ] Backup strategy in place

---

## Test Execution Log

**Date**: [Fill in during testing]  
**Tester**: [Your name]  
**Environment**: Development / Staging / Production

| Scenario             | Status | Notes |
| -------------------- | ------ | ----- |
| 1. First Time User   | ⏳     |       |
| 2. Basic Q&A         | ⏳     |       |
| 3. Multi-Turn Conv   | ⏳     |       |
| 4. Conv Management   | ⏳     |       |
| 5. Error Handling    | ⏳     |       |
| 6. Loading States    | ⏳     |       |
| 7. Responsive Design | ⏳     |       |
| 8. Performance       | ⏳     |       |

**Overall Result**: ⏳ Pending / ✅ Pass / ❌ Fail

---

## Next Steps After Testing

1. **Document Bugs**: Create issues for any failures
2. **Optimize**: Address performance bottlenecks
3. **Polish**: Improve UX based on feedback
4. **Deploy**: Push to staging environment
5. **Monitor**: Set up analytics and error tracking
6. **Iterate**: Plan Phase 8 enhancements based on usage

---

## Support

**Issues?** Check:

- Backend logs: `docker-compose -f docker-compose.dev.yml logs backend`
- Frontend console: Browser DevTools (F12)
- Elasticsearch: http://localhost:9200/\_cat/indices
- API Docs: http://localhost:8000/docs

**Still stuck?** Review:

- PHASE_7_SUMMARY.md - Implementation details
- .github/instructions/meeting-synthesis.instructions.md - Project conventions
- docs/README_KNOWLEDGE_BASE.md - KB architecture
