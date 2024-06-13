import puppeteer, { Browser } from "puppeteer";

// https://duckduckgo.com/?q=!ud%20dog&format=json&pretty=1&no_html=1&no_redirect=1

interface DDGSearchResult {
    url: string,
    title: string,
    description: string
}
export class DDG {
    _browser: Promise<Browser>;
    browser: Browser | undefined;
    constructor() {
        this.browser = undefined;
        this._browser = puppeteer.launch({ headless: true,args:["--no-sandbox"]}) //--no-sandbox cause docker 
        this._browser.then(browser => {
            this.browser = browser;
        })
    }
    ready(): Promise<boolean> {
        return new Promise(async (resolve) => {
            await this._browser;
            resolve(true);
        })
    }
    query(qs: string): Promise<DDGSearchResult[]> {
        return new Promise(async (resolve_, reject) => {
            if (!this.browser) throw "Browser not ready";
            const page = await this.browser.newPage();
            async function resolve(v: any) {
                await page.close()
                resolve_(v);
            }
            try {
                await page.goto(`https://duckduckgo.com/?q=${encodeURIComponent(qs)}`, { waitUntil: "networkidle2" });
                console.log(page.url());
                if ((new URL(page.url())).hostname != "duckduckgo.com") {
                    const title = await page.title();
                    let description: string;
                    try {
                        description = await page.$eval("meta[name=Description]", meta => meta.content);
                    } catch (err) {
                        description = "";
                    }
                    const entry: DDGSearchResult = {
                        url: page.url(),
                        title: title,
                        description: description
                    }
                    resolve([entry])
                    return;
                } else {
                    const entries = await page.$$("article");
                    const links = await Promise.all(entries.map(async (v) => {
                        const link = await (await v.$("h2 a"))!.evaluate(a => a.href);
                        const title = await (await v.$("h2 span"))!.evaluate(span => span.textContent);
                        let description: string;
                        try {
                            const _ = await (await v.$("[data-result]>span>span"))!.evaluate(span => span.textContent);
                            description = _ ? _ : "";
                        } catch (err) {
                            description = "";
                        }
                        return {
                            url: link,
                            title: title,
                            description: description
                        };
                    }));
                    return resolve(links);
                }
            } catch (err) {
                console.error(err);
                return resolve([]);
            }
        });
    }
}