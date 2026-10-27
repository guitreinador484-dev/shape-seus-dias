<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Exercise video identification extracts representative frames in the browser and uses an admin-authorized server function; never send large videos to the AI gateway.
- AI exercise names are reviewable suggestions; duplicate warnings compare exercise and gym without deleting or merging recordings automatically.
- Video upload progress lives in a browser-session external store shared by the library and root indicator; track completion only after metadata saves and warn before page unload, because uploads cannot survive browser closure.
- Temporary passwords use a shared browser-safe generator with flow-specific lengths so registration defaults satisfy its server validation without changing password-reset behavior.
- Purchased automatic workouts share a browser-safe video catalogue policy for immediate generation and AI validation; recheck eligibility before saving and persist canonical exercise IDs so private video access resolves correctly. Complexity inferred from exercise names is conservative, not a reviewed clinical assessment.
