# Known Limitations / Open TODOs

## New thread compose (unresolved)
`sendMessage` requires a `thread_id` / `parent_id`. The correct value for brand-new conversations
(no existing thread) hasn't been confirmed from the API. Currently tapping "Message" on a profile
with no prior thread falls back to opening the inbox.
**Fix needed**: determine what `parent_id` value the API accepts for new threads (likely `"0"` or `""`),
then wire up a compose screen.

## Old HTML endpoints
`/oink/index.php` non-JSON endpoints are not implemented. Could be added as fallback if JSON endpoints degrade.

## Firefox Android
Not tested.
