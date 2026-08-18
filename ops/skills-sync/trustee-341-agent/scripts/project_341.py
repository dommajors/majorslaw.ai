#!/usr/bin/env python3
"""Project a 341 hearing. Usage:
   project_341.py --filing 2026-08-14 --division "W.D. Wash. - Seattle" --chapter 7 [--trustee Klein]
Prints the Anticipated 341 block and the derived ladder. Court holidays are excluded.
Output is PROJECTED. Never client-facing until the ECF notice makes it OFFICIAL.
"""
import json, argparse, datetime, os, sys

WD = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']
HERE = os.path.dirname(os.path.abspath(__file__))
STORE = os.path.join(HERE, '..', 'references', 'trustee-profile-store.json')

def federal_holidays(year):
    """Federal court closures. Court is closed -> no 341 session."""
    def nth_wd(y, m, wd, n):
        d = datetime.date(y, m, 1)
        d += datetime.timedelta((wd - d.weekday()) % 7)
        return d + datetime.timedelta(7 * (n - 1))
    def last_wd(y, m, wd):
        d = datetime.date(y, m + 1, 1) - datetime.timedelta(1)
        return d - datetime.timedelta((d.weekday() - wd) % 7)
    def observed(d):
        if d.weekday() == 5: return d - datetime.timedelta(1)
        if d.weekday() == 6: return d + datetime.timedelta(1)
        return d
    h = {
        observed(datetime.date(year,1,1)):  "New Year's Day",
        nth_wd(year,1,0,3):                 'MLK Day',
        nth_wd(year,2,0,3):                 "Presidents' Day",
        last_wd(year,5,0):                  'Memorial Day',
        observed(datetime.date(year,6,19)): 'Juneteenth',
        observed(datetime.date(year,7,4)):  'Independence Day',
        nth_wd(year,9,0,1):                 'Labor Day',
        nth_wd(year,10,0,2):                'Columbus Day',
        observed(datetime.date(year,11,11)):'Veterans Day',
        nth_wd(year,11,3,4):                'Thanksgiving',
        observed(datetime.date(year,12,25)):'Christmas Day',
    }
    h[nth_wd(year,11,3,4) + datetime.timedelta(1)] = 'Day after Thanksgiving'
    return h

def norm(s):
    return s.replace('—','-').replace('–','-').strip().lower()

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--filing', required=True)
    ap.add_argument('--division', required=True)
    ap.add_argument('--chapter', required=True, choices=['7','13'])
    ap.add_argument('--trustee', default=None)
    ap.add_argument('--store', default=STORE)
    a = ap.parse_args()

    d = json.load(open(a.store))
    filing = datetime.date.fromisoformat(a.filing)
    key = next((k for k in d['rotation_panels']
                if norm(k.split(' | ')[0]) == norm(a.division)
                and k.split(' | ')[1] == 'ch' + a.chapter), None)
    if not key:
        print(f'BLOCKED - division not in profile store: {a.division} ch{a.chapter}')
        print('Known divisions: ' + '; '.join(sorted({k.split(" | ")[0] for k in d["rotation_panels"]})))
        return 2
    div = key.split(' | ')[0]
    pan = d['rotation_panels'][key]
    lo, hi = (21,50) if a.chapter == '13' else (21,40)
    duty = set(pan['duty_weekdays'])

    hol = {}
    for y in {filing.year, (filing + datetime.timedelta(hi)).year}:
        hol.update(federal_holidays(y))

    raw = [filing + datetime.timedelta(n) for n in range(lo, hi+1)
           if WD[(filing + datetime.timedelta(n)).weekday()] in duty]
    cands  = [c for c in raw if c not in hol]
    closed = [(c, hol[c]) for c in raw if c in hol]
    if not cands:
        print('BLOCKED - no duty weekday in window after holiday exclusion')
        return 2

    def profile(t):
        return next((p for p in d['trustee_profiles']
                     if p['trustee'] == t and norm(p['division']) == norm(div)), None)

    trustee = a.trustee or (pan['panel'][0]['trustee'] if len(pan['panel']) == 1 else None)
    if trustee:
        p = profile(trustee)
        if not p:
            print(f'BLOCKED - trustee not in profile store: {trustee} @ {div}')
            return 2
        lat = [c for c in cands if WD[c.weekday()] in set(p['sitting_weekdays'])]
        if not lat:
            print(f'BLOCKED - {trustee} has no sitting weekday in the window')
            return 2
        anchor, tier, earliest = lat[0], 'B', lat[0]
        cands = lat
    else:
        anchor = min(cands, key=lambda x: (abs((x-filing).days - 27), x))
        tier, earliest = 'A', cands[0]

    print(f'ANTICIPATED 341 - PROJECTED (tier {tier})')
    print(f'  division      {div}   chapter {a.chapter}')
    print(f'  filing        {filing} ({WD[filing.weekday()]})')
    print(f'  window        +{lo}..+{hi}  ->  {filing+datetime.timedelta(lo)} .. {filing+datetime.timedelta(hi)}')
    print(f'  duty weekdays {sorted(duty, key=WD.index)}   n={pan["n"]} observed')
    print(f'  candidates    ' + ', '.join(f'{c} {WD[c.weekday()]}' for c in cands))
    for c, name in closed:
        print(f'  EXCLUDED      {c} {WD[c.weekday()]} - {name} (court closed)')
    print(f'  ANCHOR        {anchor} ({WD[anchor.weekday()]})  +{(anchor-filing).days}d')
    print(f'  EARLIEST      {earliest} ({WD[earliest.weekday()]})  <- conservative edge, all deadlines derive from this')
    print('  platform      Zoom')

    if tier == 'B':
        p = profile(trustee)
        print(f'  TRUSTEE       {trustee}  (weekday confidence {p.get("weekday_confidence","?")})')
        print(f'  ZOOM          ID {p["zoom_meeting_id"]}   passcode {p["zoom_passcode"]}')
        print(f'  SLOTS         ' + ', '.join(p['slot_lattice']))
        print(f'  continuance   {p.get("continuance_rate",0):.1%}')
    else:
        print(f'  TRUSTEE       UNASSIGNED - rotation panel of {len(pan["panel"])}, blind draw at filing:')
        for x in pan['panel']:
            pr = profile(x['trustee'])
            z = f'ID {pr["zoom_meeting_id"]} pass {pr["zoom_passcode"]}' if pr else 'no profile'
            print(f'                  {x["trustee"]:<14}{x["share"]:>6.1%}   {z}')
        slots = sorted({s for x in pan['panel'] if profile(x['trustee'])
                        for s in profile(x['trustee'])['slot_lattice']},
                       key=lambda s: datetime.datetime.strptime(s, '%I:%M %p'))
        print('  SLOT MENU     ' + ', '.join(slots))

    print('\nDERIVED LADDER (off EARLIEST candidate - conservative edge)')
    for off, lbl in [(-17,'G6 stages trustee package for approval'),
                     (-14,'TARGET - trustee package delivered'),
                     (-7 ,'HARD FLOOR - tax return to trustee, Sec.521(e)(2)(A)(i)')]:
        dt = earliest + datetime.timedelta(off)
        warn = '  [falls on a weekend - move to the business day BEFORE]' if dt.weekday() >= 5 else ''
        print(f'  E341{off:+d} = {dt} ({WD[dt.weekday()]})  {lbl}{warn}')
    print('  A341-3 / A341: client reminders - ACTUAL date only, never projected.')
    print('\nPROJECTED. Not client-facing. Flips to OFFICIAL only on the ECF 341 notice.')
    return 0

if __name__ == '__main__':
    sys.exit(main())
