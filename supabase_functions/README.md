# Supabase Edge Functions

This directory contains Edge Functions for the Shira app that need to be deployed to Supabase.

## Available Functions

### delete-user

This function deletes a user's authentication record from Supabase Auth. It requires the Service Role Key to perform this operation.

### conversation-handler

This function processes spoken language recordings, evaluates pronunciation, and generates continuing conversations for the language learning feature. It integrates Google Speech-to-Text and Google Gemini to create an interactive language practice experience.

See the [conversation-handler README](./supabase/functions/conversation-handler/README.md) for detailed documentation.

## Deployment Instructions

1. Install the Supabase CLI if you haven't already:
   ```bash
   npm install -g supabase
   ```

2. Login to your Supabase account:
   ```bash
   supabase login
   ```

3. Link your project (replace `your-project-id` with your actual Supabase project ID):
   ```bash
   supabase link --project-ref your-project-id
   ```

4. Deploy the function:
   ```bash
   supabase functions deploy delete-user --no-verify-jwt
   ```

   Note: The `--no-verify-jwt` flag allows the function to be called without a valid JWT. In production, you might want to remove this flag and implement proper authentication.

5. Set up the required environment variables:
   ```bash
   supabase secrets set SUPABASE_URL=https://your-project-id.supabase.co
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

## Usage from Client

Once deployed, you can call this function from your client application:

```typescript
const { error } = await supabase.functions.invoke('delete-user', {
  body: { userId: 'user-id-to-delete' }
});

if (error) {
  console.error('Error deleting user:', error);
} else {
  console.log('User deleted successfully');
}
```

## Security Considerations

- The Service Role Key has admin privileges, so keep it secure.
- Consider adding additional authentication checks in the function.
- In production, you should verify the JWT to ensure only authenticated users can call this function. 