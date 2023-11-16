import { findProfessorRMP } from "../rmp"

test('it finds existing professor', async () => {
  const data = await findProfessorRMP("John Cole");
  expect(data).toMatchObject({
    found: true,
    data: {
      firstName: "John",
      lastName: "Cole"
    }
  })
})

test('it finds existing professor reversed name', async () => {
  const data = await findProfessorRMP("Cole, John");
  expect(data).toMatchObject({
    found: true,
    data: {
      firstName: "John",
      lastName: "Cole"
    }
  })
})

test('it does not find a non-existing professor', async () => {
  const data = await findProfessorRMP("thisprofessorcannotexistelsethesearchisverybroken111");
  expect(data).toMatchObject({
    found: false,
  })
})
