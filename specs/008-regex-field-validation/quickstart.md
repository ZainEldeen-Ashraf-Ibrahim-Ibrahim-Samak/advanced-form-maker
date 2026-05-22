# Quickstart: Regex Field Validation

## 1. Using the Centralized Regex Registry
Validation patterns are strictly defined in code to prevent ReDoS Vulnerabilities. Import patterns from `src/constants/constants.ts` (or `@/constants/constants`).

```typescript
import { PHONE_REGEX, EMAIL_REGEX, NAME_REGEX } from "@/constants/constants";

// Usage in Zod or standalone functions
const isValid = PHONE_REGEX.test(value);
```

## 2. Dynamic Field Validation via Wrapper Components
Do not rely on generic error strings for Name, Phone, or Email fields. Always use the dedicated wrapper components for real-time keystroke validation, auto-formatting, and bilingual RTL support.

```tsx
import EmailRegix from "@/components/validation/EmailRegix";
import PhoneRegix from "@/components/validation/PhoneRegix";

// Inside your form / view model
const [email, setEmail] = useState('');
const [phone, setPhone] = useState('');

return (
  <form>
    // Native Input here
    <input type="email" value={email} onChange={e => setEmail(e.target.value)} />
    
    // Live validation feedback
    <EmailRegix email={email} showTypoSuggestions={true} />
    
    // Native Input here for phone
    <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
    
    // Live phone validation with auto +20 formatting
    <PhoneRegix number={phone} setNumber={setPhone} />
  </form>
);
```

## 3. Adding a new Regex type to Form Templates
In the Admin Form Builder:
1. Admins **MUST NOT** type raw string regexes.
2. Admins select from a predefined dropdown (e.g., `Email`, `Phone`, `Name`, `Custom`).
3. If they select a registered type, the UI automatically provisions the matching Wrapper component.

## 4. Testing
- Run `npm run test` to verify the standalone behaviors in `validateEmailEnhanced` and `formatPhoneNumber`.
- Ensure boundary cases (empty strings, mixed Arabic/English digits) map correctly to valid `+20` numbers for the `PhoneRegix`.
