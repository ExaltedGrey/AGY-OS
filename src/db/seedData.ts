import { addDaysISO, getTodayISO } from '../utils/date';
import type { FieldnotesRepository } from './repository';

export function seedSampleMinistryData(repo: FieldnotesRepository): string {
  const maria = repo.createContact({
    name: 'Maria Santos',
    status: 'bible_study',
    address: '418 Cedarbrook Lane',
    apartment: 'Apt 2B',
    territory: 'Northside — Map 14',
    best_time: 'Sat mornings around 10:30 AM',
    language: 'English / Spanish',
    phone: '(555) 234-8910',
    publication: 'Enjoy Life Forever! (Book)',
    current_lesson: 'Lesson 04',
    lesson_progress: 4,
    lesson_total: 60,
    next_visit_date: getTodayISO(),
    pinned: true,
    notes: `## Background & Family
Very warm and thoughtful reader. Lives with her husband [[Carlos Santos]] who sometimes listens from the kitchen.

> "The righteous will possess the earth, and they will live forever on it." — Ps 37:29

## Study Prep
- [x] Bring large-print *Enjoy Life Forever!* book
- [ ] Review video *Does God Have a Name?* in Lesson 04
- [ ] Invite to upcoming weekend public talk

#bible-study #family #enjoy-life-forever`,
  });

  repo.addVisit({
    contact_id: maria.id,
    visit_date: addDaysISO(-14),
    outcome: 'study_conducted',
    scriptures: '2 Tim 3:16, 17; Isa 48:17, 18',
    publication_placed: 'Enjoy Life Forever! (Book) — Lesson 03',
    next_question: 'How can we get to know God personally and learn his name?',
    notes: 'Really appreciated how practical Bible principles are for family peace. Asked great questions about how the Bible was preserved.',
  });

  repo.addVisit({
    contact_id: maria.id,
    visit_date: addDaysISO(-7),
    outcome: 'study_conducted',
    scriptures: 'Ps 83:18; Jas 4:8',
    publication_placed: 'Started Lesson 04 (Who Is God?)',
    next_question: 'What qualities of Jehovah draw us closest to him?',
    notes: 'Completed points 1–3 of Lesson 04. She highlighted Ps 83:18 in her own Bible. Agreed to finish Lesson 04 this Saturday.',
  });

  const carlos = repo.createContact({
    name: 'Carlos Santos',
    status: 'return_visit',
    address: '418 Cedarbrook Lane',
    apartment: 'Apt 2B',
    territory: 'Northside — Map 14',
    best_time: 'Sun afternoons',
    language: 'English / Spanish',
    phone: '',
    publication: '',
    current_lesson: '',
    lesson_progress: 0,
    lesson_total: 60,
    next_visit_date: addDaysISO(2),
    pinned: false,
    notes: `Husband of [[Maria Santos]]. Works weekdays as an electrician and enjoys science and astronomy.

## Interests
- Asked about harmony between the Bible and science
- Mentioned enjoying short videos when he has 5 minutes

- [ ] Share *Was Life Created?* brochure or short video on JW.org

#science #husband #northside`,
  });

  repo.addVisit({
    contact_id: carlos.id,
    visit_date: addDaysISO(-10),
    outcome: 'spoke',
    scriptures: 'Job 26:7; Heb 3:4',
    publication_placed: 'Video: Why Study the Bible?',
    next_question: 'Is there logical evidence that life was designed?',
    notes: 'Friendly 8-minute chat on the porch while Maria was finishing dinner. Liked the illustration at Heb 3:4.',
  });

  const david = repo.createContact({
    name: 'David Chen',
    status: 'return_visit',
    address: '92 Maplewood Ave',
    apartment: '',
    territory: 'Oak Park — Map 07',
    best_time: 'Weekday evenings after 6 PM',
    language: 'English',
    phone: '',
    publication: 'Enjoy Life Forever! (Brochure)',
    current_lesson: 'Lesson 01',
    lesson_progress: 1,
    lesson_total: 3,
    next_visit_date: addDaysISO(-1),
    pinned: false,
    notes: `Retired history teacher. Appreciates calm, respectful conversations and likes reading ahead before we return.

## Notes
- Recently lost his older brother; deeply comforted by the resurrection hope
- Prefers knocking gently on the side porch door

#hope #resurrection #evening-call`,
  });

  repo.addVisit({
    contact_id: david.id,
    visit_date: addDaysISO(-12),
    outcome: 'spoke',
    scriptures: 'Rev 21:3, 4; John 5:28, 29',
    publication_placed: 'Enjoy Life Forever! (Brochure)',
    next_question: 'How can the Bible help us cope with grief and look forward to the future?',
    notes: 'Thoughtful conversation at the front steps. Took the brochure and said he would read Lesson 01 before next week.',
  });

  return maria.id;
}
