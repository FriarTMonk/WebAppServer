# Workflow Navigation Integration

The workflow management page is available at /counsel/workflows.

To integrate into navigation:
- Add a link to /counsel/workflows in the counselor navigation component
- Label: "Workflow Rules" or "Automation"
- Icon: automation/workflow icon (if using icons)

Example:
```tsx
<Link href="/counsel/workflows" className="nav-link">
  Workflow Rules
</Link>
```

