function sample1() {
  const prompt = [
    `About "Condition" and "Mission", run "Mission" with "Condition".`,
    `<Condition>`,
    `- There is a Google Spreadsheet including "Sheet1" and "Sheet2".`,
    `- "Sheet1" has 1000 rows including the first header row and 10 columns.`,
    `</Condition>`,
    `<Mission>`,
    `- Create a script that can efficiently move only rows where the column "A" is not empty from "Sheet1" to "Sheet2" on a Google Spreadsheet using Google Apps Script with low processing costs.`,
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
