function sample1() {
  const prompt = [
    `About "Condition" and "Mission", run "Mission" with "Condition".`,
    `<Condition>`,
    `- "Sheet1" has 100000 rows and 10 columns.`,
    `- Various values are put into all cells.`,
    `</Condition>`,
    `<Mission>`,
    `- Create a script that can efficiently search for a value from "Sheet1" using Google Apps Script with low processing costs.`,
    `- Return the result as an array including A1Notation.`,
    `</Mission>`,
  ].join("\n");
  const object = {
    forGemini: {
      model: "models/gemini-1.5-pro-exp-0827", // or "models/gemini-1.5-pro-latest" or "models/gemini-1.5-flash-latest"
      apiKey: "###", // Please set your API key for using Gemini API.
      prompt
    }
  };
  const res = new GenerateScript(object).run();
  console.log(res.script);
  console.log(res.descriptionOfScript);
}
