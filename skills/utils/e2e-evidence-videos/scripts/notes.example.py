"""Caption text per recorded scenario. Copy to <workdir>/notes.py and edit.

SCENARIOS maps the run id (the <id> given to run-scenarios.sh) to:
  ticket      shown bold in the top band
  file        output name under <workdir>/out/
  scenario    the Gherkin scenario title
  bug         one or two sentences: what went wrong before the fix (top band, whole video)
  fixed       which code ran, shown on the PASSED card (merged PR, open PR + local build, ...)
  notes       [(step-title prefix, note)]: a yellow note from the first step whose title starts
              with the prefix; the video freezes 4 s there. Point them at the steps where the bug
              showed up ("The bug: ... Fixed: ...").
  why_failed  optional: shown on the FAILED card, e.g. when the failure is the environment, not the fix

Example below: the NGS-4202 / NGS-4271 run of 2026-10-27.
"""

BUG_4202 = ('With two locations selected, Reschedule offered providers from BOTH locations. Picking one '
            'who does not work at the panel\'s location was rejected by the server '
            '(provider_not_at_location) and the reschedule silently did not happen.')
BUG_4271 = ('After an AI-proposed appointment is dragged, the calendar shows the new slot but the proposal '
            'keeps the OLD slot until the rules re-check answers. Confirming in that window booked the '
            'old slot (or hit a false hard conflict), not what the calendar showed.')
FIXED_4202 = 'Fix: ehr-scheduler-website-react #1018 (merged) · run on SQA'
WHY_4271 = ('Not the fix: the live SQA assistant replied with a text list of 14 appointment types instead of '
            'the TREAT/EVAL buttons, so it never proposed a slot to drag. The deployed SQA scheduler '
            '(without the fix) fails at the same step today.')
FIXED_4271 = 'Fix: ehr-scheduler-website-react #1021 (open PR, local build) · run on SQA'

SCENARIOS = {
    '4202-1': {
        'ticket': 'NGS-4202', 'file': 'NGS-4202-1-other-location-provider-not-offered.mp4',
        'scenario': 'A provider who works only at another selected location is not offered',
        'bug': BUG_4202, 'fixed': FIXED_4202,
        'notes': [
            ('And the user selects the "Automation Aether" and "Automation Roar" locations',
             'Setup: two locations selected (Aether + Roar). The appointment is at Aether.'),
            ('When the user checks the options available in the Provider field',
             'The bug: "ApptDetails Provider PT" works only at Roar, yet it was listed for this Aether '
             'appointment. Choosing it made the reschedule fail with provider_not_at_location.'),
            ('And the following providers are available',
             'Fixed: only the providers who work at Aether are offered.'),
        ],
    },
    '4202-2': {
        'ticket': 'NGS-4202', 'file': 'NGS-4202-2-location-change-clears-provider.mp4',
        'scenario': 'Changing the location clears a provider who does not work there',
        'bug': BUG_4202, 'fixed': FIXED_4202,
        'notes': [
            ('And the user changes the reschedule form location to "Automation Roar"',
             'The bug: "Reschedule Provider PT2" works only at Aether. After switching the panel to Roar it '
             'stayed selected, and Reschedule sent a pair the server rejects.'),
            ('Then the reschedule form provider does not show',
             'Fixed: the provider is cleared and Reschedule is disabled until a valid provider is picked.'),
            ('When the user checks the options available in the Provider field',
             'Fixed: the list now follows Roar, so PT2 is not offered.'),
        ],
    },
    '4202-3': {
        'ticket': 'NGS-4202', 'file': 'NGS-4202-3-both-locations-provider-reschedules.mp4',
        'scenario': 'A provider who works at both locations survives the location change and reschedules',
        'bug': BUG_4202, 'fixed': FIXED_4202,
        'notes': [
            ('And the user changes the reschedule form location to "Automation Roar"',
             'Guard against over-fixing: "General Provider PT" works at both locations, so it must stay '
             'selected after the change.'),
            ('When the user saves the rescheduled appointment',
             'A valid provider/location pair: the reschedule must go through (it used to fail only for '
             'invalid pairs).'),
        ],
    },
    '4271-1': {
        'why_failed': WHY_4271,
        'ticket': 'NGS-4271', 'file': 'NGS-4271-1-confirm-waits-for-recheck.mp4',
        'scenario': "Confirming waits for a dragged proposal's rules check and then books the new slot",
        'bug': BUG_4271, 'fixed': FIXED_4271,
        'notes': [
            ('And the user drags the proposed appointment to "3:00 PM" while its rules check is held',
             'The test holds the rules re-check, so the window where the bug happened stays open.'),
            ('Then the "Confirm appointment" quick reply is disabled',
             'The bug: "Confirm appointment" stayed clickable here and booked the pre-drag slot. '
             'Fixed: it is disabled while the re-check runs.'),
            ('When the user attempts to click the "Confirm appointment" quick reply',
             'The click and the card double-click are tried anyway: nothing may be sent or booked.'),
            ('When the rules check of the proposed appointment completes',
             'Re-check answered: Confirm is enabled again.'),
            ('Then an "EVAL" appointment is booked through the assistant',
             'Fixed: the booked slot is the dropped one (3:00 PM), not the old one.'),
        ],
    },
    '4271-2': {
        'why_failed': WHY_4271,
        'ticket': 'NGS-4271', 'file': 'NGS-4271-2-typed-confirm-waits-for-recheck.mp4',
        'scenario': "A typed confirmation waits for a dragged proposal's rules check and then books the new slot",
        'bug': BUG_4271, 'fixed': FIXED_4271,
        'notes': [
            ('And the user drags the proposed appointment to "4:00 PM" while its rules check is held',
             'The test holds the rules re-check, so the window where the bug happened stays open.'),
            ('And the user tries to send "Confirm appointment"',
             'The bug: typing "Confirm appointment" went to the assistant at once and booked the old slot. '
             'Fixed: the text stays in the message box, unsent.'),
            ('When the rules check of the proposed appointment completes',
             'Re-check answered: the confirmation can be sent now.'),
            ('Then an "EVAL" appointment is booked through the assistant',
             'Fixed: the booked slot is the dropped one (4:00 PM).'),
        ],
    },
    '4271-3': {
        'why_failed': WHY_4271,
        'ticket': 'NGS-4271', 'file': 'NGS-4271-3-finalize-waits-for-recheck.mp4',
        'scenario': "Finalize waits for a dragged proposal's rules check (selected-appointment booking flag OFF)",
        'bug': BUG_4271, 'fixed': FIXED_4271,
        'notes': [
            ('And the user drags the proposed appointment one hour later while its rules check is held',
             'Multi-proposal case with the selected-appointment booking flag OFF: the old guard did not '
             'cover it at all.'),
            ('Then the "Finalize booking of all suggested appointments" quick reply is disabled',
             'The bug: "Finalize booking" stayed clickable during the re-check and booked the old slot. '
             'Fixed: it is disabled.'),
            ('When the rules check of the proposed appointment completes',
             'Re-check answered: Finalize is enabled again.'),
        ],
    },
    '4271-4': {
        'ticket': 'NGS-4271', 'file': 'NGS-4271-4-card-double-click-waits.mp4',
        'scenario': "A card double-click waits for the card's Suggested-Time re-check",
        'bug': BUG_4271, 'fixed': FIXED_4271,
        'notes': [
            ('And the user applies a Suggested Time to proposed appointment card number 1',
             'Applying a Suggested Time starts a conflict re-check (held by the test).'),
            ('When the user attempts to double-click proposed appointment card number 1',
             'The bug: double-clicking the card confirmed it without checking for a pending re-check. '
             'Fixed: nothing is sent.'),
            ('When the held conflict re-evaluation is allowed to resolve',
             'Re-check answered: Confirm is enabled again.'),
        ],
    },
    '4271-5': {
        'why_failed': WHY_4271,
        'ticket': 'NGS-4271', 'file': 'NGS-4271-5-tile-locked-while-assistant-answers.mp4',
        'scenario': 'A proposed tile cannot be moved while the assistant answers its confirmation',
        'bug': BUG_4271, 'fixed': FIXED_4271,
        'notes': [
            ('And the user confirms the appointment while the assistant\'s reply is held',
             'Confirmation sent; the test holds the assistant\'s reply.'),
            ('And the user drags the proposed appointment to "3:00 PM"',
             'The bug: the tile could still be dragged here, so the booking could use a slot other than the '
             'one confirmed. Fixed: the tile does not move.'),
            ('Then an "EVAL" appointment is booked through the assistant',
             'Fixed: the booked slot is the one that was confirmed.'),
        ],
    },
}
