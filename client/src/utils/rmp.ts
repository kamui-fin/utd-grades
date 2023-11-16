type RateMyProfessorInfo = {
  found: boolean;
  data?: {
    legacyId: string;
    averageRating: number;
    numRatings: number;
    wouldTakeAgainPercentage: number;
    averageDifficulty: number;
    department: string;
    firstName: string;
    lastName: string;
  };
};

// Credits: UTDNebula/utd-trends
export const findProfessorRMP = async (professor: string): Promise<RateMyProfessorInfo> => {
  const url = new URL(
    'https://www.ratemyprofessors.com/search/professors/1273?',
  ); //UTD
  url.searchParams.append('q', professor);
  const res = await fetch(url.href, { method: "GET" });
  const text = await res.text();
  const regex =
    /"legacyId":(\w+),"avgRating":([\d.]+),"numRatings":(\d+),"wouldTakeAgainPercent":([\d.]+),"avgDifficulty":([\d.]+),"department":"([\w\s]+)","school":.+?,"firstName":"([\w-]+)","lastName":"([\w-]+)"/;
  const regexArray = text.match(regex);
  if (regexArray != null) {
    return {
      found: true,
      data: {
        legacyId: regexArray[1]!!,
        averageRating: Number(regexArray[2]),
        numRatings: Number(regexArray[3]),
        wouldTakeAgainPercentage: Number(regexArray[4]),
        averageDifficulty: Number(regexArray[5]),
        department: regexArray[6]!!,
        firstName: regexArray[7]!!,
        lastName: regexArray[8]!!,
      }
    };
  } else {
    return {found: false};
  }
}
