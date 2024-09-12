/**
 * Class object for generating scripts using Gemini API.
 * @class
 */
class GenerateScript {
  constructor(obj) {
    // forGemini
    if (obj.forGemini) {
      /** @private */
      this.prompt = obj.forGemini.prompt || "";

      /** @private */
      this.apiKey = obj.forGemini.apiKey || "";

      /** @private */
      this.model = obj.forGemini.model;
    }

    // forStackoverflow
    /** @private */
    this.useStackoverflow = !!obj.forStackoverflow;
    if (this.useStackoverflow) {
      /** @private */
      this.onlySearchQuestions = obj.forStackoverflow.onlySearchQuestions || false;

      /** @private */
      this.exportPDF = obj.forStackoverflow.exportPDF || false;

      /** @private */
      this.searchQuery = obj.forStackoverflow.searchQuery;

      /** @private */
      this.searchTags = obj.forStackoverflow.searchTags;

      /** @private */
      this.numberOfQuestions = obj.forStackoverflow.numberOfQuestions || 10;

      /** @private */
      this.stackExchangeAPIURL = "https://api.stackexchange.com/2.3/search/advanced";

      /** @private */
      this.stackExchangeAPIObj = {
        access_token: obj.forStackoverflow.access_token,
        key: obj.forStackoverflow.key,
        pagesize: 100,
        order: "desc",
        sort: "relevance",
        accepted: true,
        closed: false,
        migrated: false,
        notice: false,
        wiki: false,
        site: "stackoverflow",
        filter: "!-tS9_NPV1puxkptfqnI5" // <--- https://api.stackexchange.com/docs/create-filter#include=.items%3B.quota_max%3B.quota_remaining%3B.has_more%3Bquestion.title%3Bquestion.link%3Bquestion.body%3Bquestion.answers%3Banswer.body%3Bquestion.body%3Banswer.body_markdown%3Banswer.is_accepted&base=none&unsafe=false&filter=default&run=true
      }
    }

    // forOtherSites
    /** @private */
    this.useOtherSites = !!obj.forOtherSites;
    if (this.useOtherSites && obj.forOtherSites.urls && Array.isArray(obj.forOtherSites.urls)) {
      /** @private */
      this.otherSiteUrls = obj.forOtherSites.urls;
    }
  }

  /**
   * ### Description
   * Main method.
   *
   * @return {String} Text including the generated script.
   */
  run() {
    let blobs = [];

    if (this.useOtherSites) {
      console.log(`--- Retrieving the related information from other sites.`);
      const temp = this.otherSiteUrls.map(url => this.convertHTMLToPDFBlob_({ url, convertByGoogleDoc: false }));
      blobs.push(...temp);
    }

    if (this.useStackoverflow) {
      console.log(`--- Searching the related questions and answers from Stackoverflow.`);
      const temp = this.getQuestionsAndAnswersFromStackoverflow_();
      console.log(`--- ${temp.length} questions for supporting to generate script were retrieved.`);
      if (this.onlySearchQuestions && !this.exportPDF) {
        return temp;
      }
      const blob = this.createPDFFromStackExchangeAPI_(temp.splice(0, this.numberOfQuestions));
      blobs.push(blob);
      if (this.exportPDF) {
        console.log(`--- Exporting the searched questions and answers as a PDF file to the root folder.`);
        const file = DriveApp.createFile(blob);
        if (this.onlySearchQuestions) {
          return file.getUrl();
        }
      }
    }

    return this.getScript_(blobs);
  }

  /**
   * ### Description
   * Search questions and answers from Stackoverflow using StackExchange API.
   *
   * @return {Array} Array including the searched questions and answers.
   * @private
   */
  getQuestionsAndAnswersFromStackoverflow_() {
    this.stackExchangeAPIObj.q = this.searchQuery;
    this.stackExchangeAPIObj.tagged = this.searchTags.join(";");
    const url = UtlApp.addQueryParameters(this.stackExchangeAPIURL, this.stackExchangeAPIObj);
    return JSON.parse(UrlFetchApp.fetch(url).getContentText()).items;
  }

  /**
   * ### Description
   * Search questions and answers from Stackoverflow using StackExchange API.
   *
   * @param {Array} blobs PDF blobs.
   * @return {String} Generated content using Gemini API.
   * @private
   */
  getScript_(blobs) {
    console.log(`--- Generate script from your prompt.`);
    let g = new GeminiWithFiles.geminiWithFiles({ apiKey: this.apiKey, model: this.model, response_mime_type: "application/json" });
    let q;
    if (blobs.length > 0) {
      console.log(`--- Generate script using the referenced questions and answers of Stackoverflow or other sites.`);
      q = [
        `<MainQuestion>${this.prompt}</MainQuestion>`,
        `First, understand the questions and answers in the following PDF.`,
        `As tne next step, you are required to generate a more efficient script for "MainQuestion" by referencing the questions and answers from Stackoverflow in the following PDF.`,
        `PDF includes the suitable questions and answers from Stackoverflow. You are required to generate more efficient script by understanding PDF.`,
      ].join("\n");
      const fileList = g.setBlobs(blobs).uploadFiles();
      g = g.withUploadedFilesByGenerateContent(fileList);
    } else {
      console.log(`--- Generate script without using the refferenced questions and answers of Stackoverflow and other sites.`);
      q = this.prompt;
    }
    const jsonSchema = {
      description: q,
      type: "object",
      properties: {
        script: { description: "Generated script.", type: "string" },
        descriptionOfScript: { description: "Description of the generated script.", type: "string" },
      },
    };
    return g.generateContent({ jsonSchema });
  }

  /**
   * ### Description
   * Create PDF blob from the search result.
   *
   * @param {Array} items Items including the searched questions and answers.
   * @return {Blob} PDF blob converted from HTML of the URL is returned.
   * @private
   */
  createPDFFromStackExchangeAPI_(items) {
    console.log(`--- Create HTML.`);
    const { htmlBody, links } = items.reduce((o, { answers, body, title, link }, i) => {
      const temp = [
        `<h1>Question ${i + 1}</h1>`,
        `<h2>Title: <a href="${link}">${title}</a></h2>`,
        body,
        `<h2>Solved answer to question ${i + 1}</h2>`,
        answers.find(e => e.is_accepted).body,
      ].join("");
      o.htmlBody.push(temp);
      o.links.push(link);
      return o;
    }, { htmlBody: [], links: [] });
    console.log(`--- Links of searched questions on Stackoverflow.`);
    console.log(links);
    let text = `<!DOCTYPE html><html><head><base target="_top"><style>h1 { page-break-before: always; }</style></head><body>${htmlBody.join("")}</body></html>`;

    console.log(`--- Convert image data.`);
    text.matchAll(/<img.*?>/g).forEach(e => {
      const t = e[0].match(/src\=["'](http.*?)["']/);
      if (t) {
        const imageUrl = t[1];
        const r = UrlFetchApp.fetch(imageUrl.trim(), { muteHttpExceptions: true });
        if (r.getResponseCode() == 200) {
          const blob = r.getBlob();
          const dataUrl = `data:${blob.getContentType()};base64,${Utilities.base64Encode(blob.getBytes())}`;
          text = text.replace(e[0], `<img src="${dataUrl}" width="1000">`);
        }
      }
    });

    console.log(`--- Convert HTML to PDF blob.`);
    const pdfBlob = Utilities.newBlob(text, MimeType.HTML).getAs(MimeType.PDF).setName("GenerateScriptTempFile.pdf");
    console.log(`--- Completely converted HTML to PDF blob.`);
    return pdfBlob;
  }

  /**
   * ### Description
   * Convert HTML of the inputted URL to PDF blob.
   * ref: https://medium.com/google-cloud/expanding-gemini-apis-capabilities-a-practical-solution-for-web-content-summarization-5617474b2ad1
   *
   * @param {Object} object Object for running this method.
   * @param {String} object.url URL you want to use.
   * @param {Boolean} object.convertByGoogleDoc When this is true, in order to convert HTML to PDF, Google Document is used. I think that the most cases are not required to use this. But, if you use this, please set "convertByGoogleDoc" as true. The default value is false.
   *
   * @return {Blob} PDF blob converted from HTML of the URL is returned.
   * @private
   */
  convertHTMLToPDFBlob_(object) {
    const { url, convertByGoogleDoc = false } = object;
    console.log(`--- Get HTML from "${url}".`);
    const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    let text = res.getContentText();
    if (res.getResponseCode() != 200) {
      throw new Error(text);
    }
    console.log(`--- Convert image data.`);

    // Convert the source URL of img tag to the data URL.
    text.matchAll(/<img.*?>/g).forEach(e => {
      const t = e[0].match(/src\=["'](http.*?)["']/);
      if (t) {
        const imageUrl = t[1];
        const r = UrlFetchApp.fetch(imageUrl.trim(), { muteHttpExceptions: true });
        if (r.getResponseCode() == 200) {
          const blob = r.getBlob();
          const dataUrl = `data:${blob.getContentType()};base64,${Utilities.base64Encode(blob.getBytes())}`;
          // text = text.replace(imageUrl, dataUrl);
          text = text.replace(e[0], `<img src="${dataUrl}" width="1000">`);
        }
      }
    });

    // For medium
    if (url.includes("medium.com")) {
      text.matchAll(/<picture>.*?<\/picture>/g).forEach(e => {
        const t = e[0].match(/srcSet\=["'](http.*?)["']/);
        if (t) {
          const imageUrl = t[1].split(" ")[0].trim();
          const r = UrlFetchApp.fetch(imageUrl.trim(), { muteHttpExceptions: true });
          if (r.getResponseCode() == 200) {
            const blob = r.getBlob();
            const dataUrl = `data:${blob.getContentType()};base64,${Utilities.base64Encode(blob.getBytes())}`;
            text = text.replace(e[0], `<img src="${dataUrl}"`);
          }
        }
      });
    }

    let pdfBlob;
    if (convertByGoogleDoc) {
      console.log(`--- Convert HTML to PDF blob with Google Docs.`);
      const doc = Drive.Files.create({ name: "temp", mimeType: MimeType.GOOGLE_DOCS }, Utilities.newBlob(text, MimeType.HTML));
      pdfBlob = DriveApp.getFileById(doc.id).getBlob().setName(url);
      Drive.Files.remove(doc.id);
    } else {
      console.log(`--- Convert HTML to PDF blob.`);
      pdfBlob = Utilities.newBlob(text, MimeType.HTML).getAs(MimeType.PDF).setName(url);
    }
    console.log(`--- Completely converted HTML to PDF blob.`);
    return pdfBlob;
  }
}
