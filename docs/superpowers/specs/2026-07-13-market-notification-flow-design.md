# Market Notification Flow Design

## Problem

An aligned RSI transition currently emits both a generic RSI announcement and a favorable-position announcement. The banner then displays both items sequentially at full duration. Announcer state is also reset during temporary gameplay states, so the same market condition can announce again after pause or level-up.

## Behavior

- Emit one announcement when market state crosses from unaligned to aligned with the player's position.
- Suppress the generic RSI announcement for that same aligned transition.
- Preserve transition state through temporary gameplay states and reset it only when the run ends or returns to the menu.
- Display ordinary market announcements in one replaceable slot instead of a queue.
- Keep liquidation warnings interruptible and visually dominant.
- Dismiss the aligned announcement after 1.8 seconds.

## Presentation

- Replace the generic star emoji with a directional market glyph.
- Use concise cyber-combat copy:
  - `LONG EDGE // BULL SIGNAL LOCKED`
  - `SHORT EDGE // BEAR SIGNAL LOCKED`
- Keep the existing ghost-rail visual language, but separate the position label from the muted signal detail for faster scanning.

## Data Flow

`MarketEventAnnouncer` detects the transition and emits one `marketAnnouncement`. `MarketAnnouncementBanner` renders the latest ordinary event, replacing any existing ordinary market cue. A liquidation event interrupts the current cue. No ordinary event remains queued after its relevance window.

## Testing

- Verify an aligned RSI transition emits only one favorable event.
- Verify repeated aligned updates do not re-emit.
- Verify leaving and re-entering alignment emits a new event.
- Verify a new ordinary banner replaces the current ordinary banner.
- Verify aligned banners auto-dismiss after 1.8 seconds.
- Verify liquidation events still interrupt ordinary banners.
