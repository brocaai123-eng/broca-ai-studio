# Quick Reference: Update Remaining Pages

This guide shows you how to update the remaining pages to use database hooks instead of mock data.

## Pattern to Follow

### Before (Mock Data):
```typescript
const documents = [
  { id: "1", name: "file.pdf", status: "verified", ... },
  { id: "2", name: "image.jpg", status: "pending", ... },
];

export default function DocumentsPage() {
  return <div>{documents.map(doc => ...)}</div>;
}
```

### After (Database):
```typescript
import { useDocuments, useCreateDocument, useUpdateDocument, useDeleteDocument } from "@/lib/hooks/use-database";
import { Loader2 } from "lucide-react";

export default function DocumentsPage() {
  const { data: documents, isLoading } = useDocuments();
  const createDocument = useCreateDocument();
  const updateDocument = useUpdateDocument();
  const deleteDocument = useDeleteDocument();

  if (isLoading) {
    return <div className="flex justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>;
  }

  return <div>{(documents || []).map(doc => ...)}</div>;
}
```

## Broker Portal Pages

### 1. `/dashboard/documents/page.tsx`

**Hooks to use:**
```typescript
import { useDocuments, useCreateDocument, useUpdateDocument, useDeleteDocument } from "@/lib/hooks/use-database";
```

**Replace:**
- Remove `documents` mock array
- Add `const { data: documents, isLoading } = useDocuments();`
- Add `const createDocument = useCreateDocument();`

**Create document:**
```typescript
await createDocument.mutateAsync({
  client_id: clientId,
  name: fileName,
  type: documentType, // 'contract' | 'id' | 'financial' | 'property' | 'other'
  file_url: uploadedFileUrl,
  file_size: fileSize,
  status: 'pending'
});
```

### 2. `/dashboard/forms/page.tsx`

**Hooks to use:**
```typescript
import { useFormTemplates, useCreateFormTemplate, useUpdateFormTemplate, useDeleteFormTemplate } from "@/lib/hooks/use-database";
```

**Replace:**
- Remove `formTemplates` mock array
- Add `const { data: formTemplates, isLoading } = useFormTemplates();`

**Create template:**
```typescript
await createFormTemplate.mutateAsync({
  name: "My Form Template",
  category: 'real_estate', // 'real_estate' | 'insurance' | 'mortgage' | 'custom'
  fields: formFieldsArray,
  is_active: true
});
```

### 3. `/dashboard/tokens/page.tsx`

**Hooks to use:**
```typescript
import { useTokenTransactions, useSubscription, useDeductTokens } from "@/lib/hooks/use-database";
```

**Replace:**
- Remove `tokenUsageHistory` mock array
- Add `const { data: transactions, isLoading } = useTokenTransactions();`
- Add `const { data: subscription } = useSubscription();`

**Deduct tokens:**
```typescript
const deductTokens = useDeductTokens();

await deductTokens.mutateAsync({
  amount: 10,
  action_type: 'ai_analysis', // 'ai_analysis' | 'document_process' | 'form_generation' | 'manual'
  description: "AI document analysis"
});
```

### 4. `/dashboard/subscription/page.tsx`

**Hooks to use:**
```typescript
import { useSubscription } from "@/lib/hooks/use-database";
```

**Display subscription:**
```typescript
const { data: subscription, isLoading } = useSubscription();

return (
  <div>
    <h2>{subscription?.plan?.name}</h2>
    <p>${subscription?.plan?.price}/month</p>
    <p>Tokens: {subscription?.plan?.tokens_per_month}</p>
    <p>Status: {subscription?.status}</p>
    <p>Next billing: {subscription?.current_period_end}</p>
  </div>
);
```

### 5. `/dashboard/settings/page.tsx`

**Hooks to use:**
```typescript
import { useProfile, useUpdateProfile } from "@/lib/hooks/use-database";
```

**Update profile:**
```typescript
const { data: profile, isLoading } = useProfile();
const updateProfile = useUpdateProfile();

const handleSave = async () => {
  await updateProfile.mutateAsync({
    full_name: "John Doe",
    company_name: "Real Estate Co",
    phone: "+1234567890",
    settings: {
      notifications: true,
      theme: "light"
    }
  });
};
```

## Admin Portal Pages

### 1. `/admin/brokers/page.tsx`

**Hooks to use:**
```typescript
import { 
  useAllBrokers, 
  useUpdateBrokerSubscription, 
  useDeleteBroker,
  useBrokerInvitations,
  useCreateInvitation,
  useResendInvitation,
  useDeleteInvitation
} from "@/lib/hooks/use-admin";
```

**Display brokers:**
```typescript
const { data: brokers, isLoading } = useAllBrokers();
const updateSubscription = useUpdateBrokerSubscription();
const createInvitation = useCreateInvitation();

// Show all brokers with their subscription info
{brokers?.map(broker => (
  <div key={broker.id}>
    <p>{broker.full_name} - {broker.email}</p>
    <p>Plan: {broker.subscription?.plan?.name}</p>
    <p>Clients: {broker.client_count}</p>
    <p>Tokens: {broker.subscription?.tokens_remaining}</p>
  </div>
))}
```

**Update broker plan:**
```typescript
await updateSubscription.mutateAsync({
  brokerId: broker.id,
  planId: newPlanId
});
```

**Send invitation:**
```typescript
await createInvitation.mutateAsync({
  email: "newbroker@example.com",
  plan_id: planId
});
```

### 2. `/admin/subscriptions/page.tsx`

**Hooks to use:**
```typescript
import { useSubscriptionStats, usePlatformTransactions } from "@/lib/hooks/use-admin";
```

**Display stats:**
```typescript
const { data: stats, isLoading } = useSubscriptionStats();
const { data: transactions } = usePlatformTransactions();

return (
  <div>
    <p>Starter: {stats?.starter_count} brokers</p>
    <p>Professional: {stats?.professional_count} brokers</p>
    <p>Enterprise: {stats?.enterprise_count} brokers</p>
    <p>Total Revenue: ${stats?.total_revenue}</p>
    <p>MRR: ${stats?.monthly_recurring_revenue}</p>
  </div>
);
```

### 3. `/admin/tokens/page.tsx`

**Hooks to use:**
```typescript
import { useAllTokenTransactions, useAddTokens, useAllBrokers } from "@/lib/hooks/use-admin";
```

**Display token usage:**
```typescript
const { data: transactions, isLoading } = useAllTokenTransactions();
const { data: brokers } = useAllBrokers();
const addTokens = useAddTokens();

// Show platform-wide token usage
{transactions?.map(tx => (
  <div key={tx.id}>
    <p>Broker: {tx.broker_id}</p>
    <p>Action: {tx.action_type}</p>
    <p>Amount: {tx.amount}</p>
    <p>Date: {tx.created_at}</p>
  </div>
))}
```

**Allocate tokens:**
```typescript
await addTokens.mutateAsync({
  brokerId: broker.id,
  amount: 100,
  description: "Bonus tokens"
});
```

### 4. `/admin/analytics/page.tsx`

**Hooks to use:**
```typescript
import { usePlatformStats, useActivityLog } from "@/lib/hooks/use-admin";
```

**Display analytics:**
```typescript
const { data: stats, isLoading } = usePlatformStats();
const { data: activities } = useActivityLog();

return (
  <div>
    <h2>Platform Overview</h2>
    <p>Total Brokers: {stats?.total_brokers}</p>
    <p>Active Brokers: {stats?.active_brokers}</p>
    <p>Total Clients: {stats?.total_clients}</p>
    <p>Active Clients: {stats?.active_clients}</p>
    <p>Total Documents: {stats?.total_documents}</p>
    <p>Tokens Used: {stats?.total_tokens_used}</p>
    <p>Revenue: ${stats?.total_revenue}</p>
    
    <h3>Recent Activity</h3>
    {activities?.map(activity => (
      <div key={activity.id}>
        <p>{activity.action} by {activity.user_id}</p>
        <p>{activity.details}</p>
      </div>
    ))}
  </div>
);
```

## Common Patterns

### Loading State
```typescript
if (isLoading) {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 animate-spin text-primary" />
    </div>
  );
}
```

### Empty State
```typescript
if (!data || data.length === 0) {
  return (
    <div className="text-center py-8 text-app-muted">
      <Icon className="w-12 h-12 mx-auto mb-4 opacity-50" />
      <p>No data yet</p>
      <p className="text-sm">Get started by adding your first item</p>
    </div>
  );
}
```

### Error State
```typescript
const { data, isLoading, error } = useClients();

if (error) {
  return (
    <div className="text-center py-8 text-red-500">
      <p>Error loading data</p>
      <p className="text-sm">{error.message}</p>
    </div>
  );
}
```

### Date Formatting
```typescript
import { formatDistanceToNow, format } from "date-fns";

// Relative time
<p>{formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}</p>
// Output: "2 hours ago"

// Formatted date
<p>{format(new Date(item.created_at), "MMM d, yyyy")}</p>
// Output: "Jan 3, 2026"
```

### Search/Filter
```typescript
const [searchQuery, setSearchQuery] = useState("");
const { data: items } = useClients();

const filteredItems = (items || []).filter(item =>
  item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
  item.email.toLowerCase().includes(searchQuery.toLowerCase())
);
```

## TypeScript Types

All types are available in `lib/types/database.ts`:
```typescript
import type { 
  Client, 
  Document, 
  FormTemplate, 
  TokenTransaction,
  OnboardingStatus,
  DocumentType,
  DocumentStatus 
} from "@/lib/types/database";
```

## Testing Checklist

After updating each page:
- ✅ Data loads from database
- ✅ Loading spinner shows while fetching
- ✅ Empty state displays when no data
- ✅ Error handling works
- ✅ Create/Update/Delete operations work
- ✅ Cache invalidates after mutations
- ✅ Search/filter functionality works
- ✅ Dates display correctly
- ✅ No TypeScript errors
- ✅ No console errors

## Example: Complete Page Update

```typescript
"use client";

import { useState } from "react";
import { useDocuments, useCreateDocument, useDeleteDocument } from "@/lib/hooks/use-database";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";
import DashboardLayout from "@/components/layout/DashboardLayout";

export default function DocumentsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: documents, isLoading } = useDocuments();
  const createDocument = useCreateDocument();
  const deleteDocument = useDeleteDocument();

  const filteredDocuments = (documents || []).filter(doc =>
    doc.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    if (confirm("Delete this document?")) {
      await deleteDocument.mutateAsync(id);
    }
  };

  return (
    <DashboardLayout title="Documents" subtitle="Manage client documents">
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
          />
          
          {filteredDocuments.length === 0 ? (
            <p>No documents found</p>
          ) : (
            filteredDocuments.map(doc => (
              <div key={doc.id}>
                <p>{doc.name}</p>
                <p>Status: {doc.status}</p>
                <p>{formatDistanceToNow(new Date(doc.created_at), { addSuffix: true })}</p>
                <Button onClick={() => handleDelete(doc.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))
          )}
        </>
      )}
    </DashboardLayout>
  );
}
```

## Need Help?

- Check implemented examples: `app/dashboard/page.tsx`, `app/dashboard/clients/page.tsx`
- Review hooks documentation in `lib/hooks/use-database.ts` and `lib/hooks/use-admin.ts`
- Check type definitions in `lib/types/database.ts`
- Test with React Query DevTools (already installed)
