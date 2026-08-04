# Estate Law Aid v1.1.89 — Audit Report

Live-runtime inspection of v1.1.88 rendered 967 initial cards instead of 968 and only 3 profiles for the New York jurisdiction selection. The cause was two registered directory renderers: the later inherited renderer deduplicated one record and reapplied retired exact `market` matching after the corrected state/license renderer. v1.1.89 disables that second renderer, keeps one authoritative filter runtime, and state-qualifies the two Middlesex County choices. No external fact or production state was promoted.
