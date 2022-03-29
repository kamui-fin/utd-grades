import * as csv from "csv-parse/sync";
import * as path from "path";
import * as fs from "fs/promises";
import initSqlJs, { Database } from "sql.js/dist/sql-wasm";
import type { GradesRow } from "utd-grades-models";

function reorderName(name: string): string {
  const parts = name.split(", ");
  const first = parts[1]?.trim() ?? null;
  const last = parts[0]!.trim();
  if (first) {
    return `${first} ${last}`;
  }
  return last;
}

function gradesRow(
  csvRow: Record<string, any>,
  semester: string,
  strings: Map<string, number>
): GradesRow {
  function parseNum(s?: string): number {
    if (s) return parseInt(s, 10);
    return 0;
  }

  function parseProf(s?: string): number | null {
    if (s) {
      s = reorderName(s);
      return strings.get(s) ?? null;
    }
    return null;
  }

  return {
    semester: strings.get(semester)!,
    subject: strings.get(csvRow["Subject"])!,
    catalogNumber: strings.get(
      csvRow["Catalog Number"] ?? csvRow["Catalog Nbr"] // some semesters have "Catalog Number", some have "Catalog Nbr"
    )!,
    section: strings.get(csvRow["Section"])!,
    aPlus: parseNum(csvRow["A+"]),
    a: parseNum(csvRow["A"]),
    aMinus: parseNum(csvRow["A-"]),
    bPlus: parseNum(csvRow["B+"]),
    b: parseNum(csvRow["B"]),
    bMinus: parseNum(csvRow["B-"]),
    cPlus: parseNum(csvRow["C+"]),
    c: parseNum(csvRow["C"]),
    cMinus: parseNum(csvRow["C-"]),
    dPlus: parseNum(csvRow["D+"]),
    d: parseNum(csvRow["D"]),
    dMinus: parseNum(csvRow["D-"]),
    f: parseNum(csvRow["F"]),
    cr: parseNum(csvRow["CR"]),
    nc: parseNum(csvRow["NC"]),
    p: parseNum(csvRow["P"]),
    w: parseNum(csvRow["W"] ?? csvRow["Total W"]), // TODO: some semesters have "W" and some have "Total W". Are they the same?
    i: parseNum(csvRow["I"]),
    nf: parseNum(csvRow["NF"]),
    instructor1: parseProf(csvRow["Instructor 1"]),
    instructor2: parseProf(csvRow["Instructor 2"]),
    instructor3: parseProf(csvRow["Instructor 3"]),
    instructor4: parseProf(csvRow["Instructor 4"]),
    instructor5: parseProf(csvRow["Instructor 5"]),
    instructor6: parseProf(csvRow["Instructor 6"]),
  };
}

async function parseCsv(filePath: string): Promise<Record<string, string>[]> {
  console.log(filePath);
  const fileContents = await fs.readFile(filePath);
  return csv.parse(fileContents, {
    columns: true, // detect column names from header
  });
}

async function parseDataDir(
  dataDir: string
): Promise<[Map<string, number>, GradesRow[]]> {
  let strings = new Map<string, number>();

  function add(s: string | undefined, modify?: (s: string) => string) {
    if (s) {
      if (modify) {
        s = modify(s);
      }
      if (!strings.has(s)) {
        strings.set(s, strings.size);
      }
    }
  }

  let grades: GradesRow[] = [];

  for (const fileName of await fs.readdir(dataDir)) {
    const semester = path.parse(fileName).name;
    add(semester);

    for (const csvRow of await parseCsv(path.join(dataDir, fileName))) {
      add(csvRow["Instructor 1"], reorderName);
      add(csvRow["Instructor 2"], reorderName);
      add(csvRow["Instructor 3"], reorderName);
      add(csvRow["Instructor 4"], reorderName);
      add(csvRow["Instructor 5"], reorderName);
      add(csvRow["Instructor 6"], reorderName);

      add(csvRow["Subject"]);
      add(csvRow["Catalog Number"] ?? csvRow["Catalog Nbr"]);
      add(csvRow["Section"]);

      grades.push(gradesRow(csvRow, semester, strings));
    }
  }

  return [strings, grades];
}

async function insertStrings(db: Database, strings: Map<string, number>) {
  const stmt = db.prepare(`INSERT INTO strings(id, string) VALUES (?, ?)`);
  for (const [string, id] of strings.entries()) {
    stmt.run([id, string]);
  }
  stmt.free();
}

async function createDb(): Promise<Uint8Array> {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  const initScript = await fs.readFile("src/create_db.sql");
  db.run(initScript.toString());

  const [strings, allGrades] = await parseDataDir("../data/raw");

  db.exec("BEGIN");

  await insertStrings(db, strings);

  const stmt = db.prepare(`
    INSERT INTO grades(id, aPlus, a, aMinus, bPlus, b, bMinus, cPlus, c, cMinus, dPlus, d, dMinus, f, cr, nc, p, w, i, nf, semesterId, subjectId, catalogNumberId, sectionId, instructor1Id, instructor2Id, instructor3Id, instructor4Id, instructor5Id, instructor6Id)
    VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  for (const grades of allGrades) {
    stmt.getAsObject([
      grades.aPlus,
      grades.a,
      grades.aMinus,
      grades.bPlus,
      grades.b,
      grades.bMinus,
      grades.cPlus,
      grades.c,
      grades.cMinus,
      grades.dPlus,
      grades.d,
      grades.dMinus,
      grades.f,
      grades.cr,
      grades.nc,
      grades.p,
      grades.w,
      grades.i,
      grades.nf,
      grades.semester,
      grades.subject,
      grades.catalogNumber,
      grades.section,
      grades.instructor1,
      grades.instructor2,
      grades.instructor3,
      grades.instructor4,
      grades.instructor5,
      grades.instructor6,
    ]);
  }

  stmt.free();

  db.exec("COMMIT");

  const data = db.export();
  db.close();

  return data;
}

async function main() {
  const data = await createDb();
  await fs.writeFile("../data/utdgrades.sqlite3", Buffer.from(data));
}

main();
