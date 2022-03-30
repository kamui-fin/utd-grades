import { Grades } from 'utd-grades-models';
import find from '../getSections';
import { readFile } from 'fs/promises';
import { Database } from 'sql.js';
import * as fs from 'fs/promises';
import initSqlJs from 'sql.js/dist/sql-wasm';

let db: Database;

async function initCon() {
  if (!db) {
    const SQL = await initSqlJs();
    db = new SQL.Database(
      new Uint8Array(await fs.readFile('../data/utdgrades.sqlite3'))
    );
  }
}

beforeAll(async () => {
  await initCon();
});

describe('Test sample queries', () => {
  test('Should search by course prefix and number', async () => {
    const queries = [
      {
        search: 'CS 1337',
        expected: { coursePrefix: 'CS', courseNumber: '1337' },
      },
      {
        search: 'BCOM 3310',
        expected: { coursePrefix: 'BCOM', courseNumber: '3310' },
      },
      {
        search: 'HIST 1301',
        expected: { coursePrefix: 'HIST', courseNumber: '1301' },
      },
    ];

    for (let i = 0; i < queries.length; i++) {
      const { search, expected } = queries[i];
      const response = await find({ search }, db);

      expect(response).not.toHaveLength(0);
      expect(response[0].catalogNumber).toEqual(expected.courseNumber);
      expect(response[0].subject).toEqual(expected.coursePrefix);
    }
  });

  test('Should handle lowercase course prefixes', async () => {
    const queries = [
      {
        search: 'cs 1337',
        expected: { coursePrefix: 'CS', courseNumber: '1337' },
      },
      {
        search: 'bcom 3310',
        expected: { coursePrefix: 'BCOM', courseNumber: '3310' },
      },
      {
        search: 'hist 1301',
        expected: { coursePrefix: 'HIST', courseNumber: '1301' },
      },
    ];

    for (let i = 0; i < queries.length; i++) {
      const { search, expected } = queries[i];
      const response = await find({ search }, db);

      expect(response).not.toHaveLength(0);
      expect(response[0].catalogNumber).toEqual(expected.courseNumber);
      expect(response[0].subject).toEqual(expected.coursePrefix);
    }
  });

  test('Should handle section numbers', async () => {
    const queries = [
      {
        search: 'CS 1337.001',
        expected: {
          coursePrefix: 'CS',
          courseNumber: '1337',
          sectionNumber: '1',
        },
      },
      {
        search: 'CS 1337.0U1',
        expected: {
          coursePrefix: 'CS',
          courseNumber: '1337',
          sectionNumber: '0U1',
        },
      },
      {
        search: 'BCOM 3310.HON',
        expected: {
          coursePrefix: 'BCOM',
          courseNumber: '3310',
          sectionNumber: 'HON',
        },
      },
      {
        search: 'HIST 1301 001',
        expected: {
          coursePrefix: 'HIST',
          courseNumber: '1301',
          sectionNumber: '1',
        },
      },
    ];

    for (let i = 0; i < queries.length; i++) {
      const { search, expected } = queries[i];
      const response = await find({ search }, db);

      expect(response).not.toHaveLength(0);
      expect(response[0].catalogNumber).toEqual(expected.courseNumber);
      expect(response[0].subject).toEqual(expected.coursePrefix);
      expect(response[0].section.includes(expected.sectionNumber)).toBeTruthy();
    }
  });

  test('Should handle semesters', async () => {
    const queries = [
      {
        search: 'CS 1337 fall 2019',
        expected: { coursePrefix: 'CS', courseNumber: '1337', semester: 'Fall 2019' },
      },
      {
        search: 'BCOM 3310 Summer 2019',
        expected: {
          coursePrefix: 'BCOM',
          courseNumber: '3310',
          semester: 'Summer 2019',
        },
      },
      {
        search: 'HIST 1301 Spring 2018',
        expected: {
          coursePrefix: 'HIST',
          courseNumber: '1301',
          semester: 'Spring 2018',
        },
      },
    ];

    for (let i = 0; i < queries.length; i++) {
      const { search, expected } = queries[i];
      const response = await find({ search }, db);

      expect(response).not.toHaveLength(0);
      expect(response[0].catalogNumber).toEqual(expected.courseNumber);
      expect(response[0].subject).toEqual(expected.coursePrefix);
      expect(response[0].semester).toEqual(expected.semester);
    }
  });

  test('Should handle professor names', async () => {
    const queries = [
      {
        search: 'CS 1337 Jason Smith',
        expected: {
          coursePrefix: 'CS',
          courseNumber: '1337',
          professorFirstName: 'Jason W',
          professorLastName: 'Smith',
        },
      },
      {
        search: 'CS 1337 jason smith',
        expected: {
          coursePrefix: 'CS',
          courseNumber: '1337',
          professorFirstName: 'Jason W',
          professorLastName: 'Smith',
        },
      },
      {
        search: 'CS 1337 Cole',
        expected: {
          coursePrefix: 'CS',
          courseNumber: '1337',
          professorFirstName: 'John',
          professorLastName: 'Cole',
        },
      },
      {
        search: 'CS 1337 cole',
        expected: {
          coursePrefix: 'CS',
          courseNumber: '1337',
          professorFirstName: 'John',
          professorLastName: 'Cole',
        },
      },
    ];

    for (let i = 0; i < queries.length; i++) {
      const { search, expected } = queries[i];
      const response = await find({ search }, db);

      expect(response).not.toHaveLength(0);
      expect(response[0].catalogNumber).toEqual(expected.courseNumber);
      expect(response[0].subject).toEqual(expected.coursePrefix);
      expect(response[0].instructor1?.first).toEqual(
        expected.professorFirstName
      );
      expect(response[0].instructor1?.last).toEqual(expected.professorLastName);
    }
  });

  test('Should handle professor-only', async () => {
    const queries = [
      {
        search: 'Stephen Perkins',
        expected: {
          professorFirstName: 'Stephen J',
          professorLastName: 'Perkins',
        },
      },
      {
        search: 'Kristen Lawson',
        expected: {
          professorFirstName: 'Kristen A',
          professorLastName: 'Lawson',
        },
      },
    ];

    for (let i = 0; i < queries.length; i++) {
      const { search, expected } = queries[i];
      const response = await find({ search }, db);

      expect(response).not.toHaveLength(0);
      expect(response[0].instructor1?.first).toEqual(
        expected.professorFirstName
      );
      expect(response[0].instructor1?.last).toEqual(expected.professorLastName);
    }
  });

  test('Should handle everything together', async () => {
    const queries = [
      {
        search: 'CS 1337 502 fall 2019 Stephen Perkins',
        expected: {
          coursePrefix: 'CS',
          courseNumber: '1337',
          sectionNumber: '501',
          semester: 'Fall 2019',
          professorFirstName: 'Stephen J',
          professorLastName: 'Perkins',
        },
      },
      {
        search: 'BCOM 3310 HON Fall 2019 Kristen Lawson',
        expected: {
          coursePrefix: 'BCOM',
          courseNumber: '3310',
          sectionNumber: 'HON',
          semester: 'Fall 2019',
          professorFirstName: 'Kristen A',
          professorLastName: 'Lawson',
        },
      },
    ];

    for (let i = 0; i < queries.length; i++) {
      const { search, expected } = queries[i];
      const response = await find({ search }, db);

      expect(response).not.toHaveLength(0);
      expect(response[0].catalogNumber).toEqual(expected.courseNumber);
      expect(response[0].subject).toEqual(expected.coursePrefix);
      expect(response[0].semester).toEqual(expected.semester);
      expect(response[0].instructor1?.first).toEqual(
        expected.professorFirstName
      );
      expect(response[0].instructor1?.last).toEqual(expected.professorLastName);
    }
  });
});

afterAll(async () => {
  db.close();
});
