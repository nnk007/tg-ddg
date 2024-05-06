import https from "https";
import events from "events";
import { DDG } from "./ddg";
if(!process.env.TOKEN) throw "TOKEN not set";
const ddg = new DDG();
class TG {
    static token: string = process.env.TOKEN;
    static req_get(method: string): Promise<TgBotAPI.Response<any>> {
        return new Promise((resolve, reject) => {
            const req = https.request(`https://api.telegram.org/bot${this.token}/${method}`, {});
            req.end();
            req.on("response", (res) => {
                let b: Buffer = Buffer.from([]);
                res.on("data", c => b = Buffer.concat([b, c]));
                res.on("end", () => {
                    resolve(JSON.parse(b.toString()));
                });
            })
        })
    }
    static req_post(method: string, body: any): Promise<TgBotAPI.Response<any>> {
        return new Promise((resolve, reject) => {
            const req = https.request(`https://api.telegram.org/bot${this.token}/${method}`, {
                method: "post",
                headers: {
                    "Content-Type": "application/json",
                }
            });
            req.end(JSON.stringify(body));
            req.on("response", (res) => {
                let b: Buffer = Buffer.from([]);
                res.on("data", c => b = Buffer.concat([b, c]));
                res.on("end", () => {
                    resolve(JSON.parse(b.toString()));
                })
            })
        })
    }
    static async request(method: string, body?: any): Promise<TgBotAPI.Response<any>> {
        const response = !body ? TG.req_get(method) : TG.req_post(method, body);
        if(!(await response).ok) throw `${(await response).description}`;
        return response;
    }
}
interface GetUpdatesArgs {
    offset?: number,
    limit?: number,
    timeout?: number,
    allowed_updates?: string[]
}
async function getUpdates(args?: GetUpdatesArgs): Promise<TgBotAPI.Update[]> {
    const _updates = await TG.request("getUpdates", { ...args, timeout: 60, allowed_updates: ["inline_query"] } as GetUpdatesArgs);
    return _updates.result;
}
interface InputTextMessageContent {
    message_text: string,
    parse_mode?: string,
    entities?: unknown[],
    link_preview_options?: unknown[]
}
interface InputMessageContent extends InputTextMessageContent { }
interface InlineQueryResultArticle {
    type: "article",
    id: string,
    title: string,
    input_message_content: InputMessageContent,
    url?: string,
    hide_url?: boolean,
    description?: string,
}
interface InlineQueryResult extends InlineQueryResultArticle { }
interface AnswerInlineQueryArgs {
    inline_query_id: string,
    results: InlineQueryResult[],
    cache_time?: number,
    is_personal?: boolean,
    next_offset?: string | ""
}
async function answerInlineQuery(args: AnswerInlineQueryArgs) {
    TG.req_post("answerInlineQuery", { ...args, next_offset: "" } as AnswerInlineQueryArgs)
}

async function handleInlineQuery(query: TgBotAPI.InlineQuery) {
    console.log(`[Q]: ${query.query}`);
    if (query.query.length == 0) return answerInlineQuery({ cache_time: 300, results: [], inline_query_id: query.id });
    await ddg.ready();
    const urls = await ddg.query(query.query);
    console.log("Found urls:", urls.length);
    if (urls.length == 0) return answerInlineQuery({ cache_time: 300, results: [{ id: Date.now().toString(), title: "Nothing found", type: "article", input_message_content: { message_text: "" } }], inline_query_id: query.id });
    return answerInlineQuery({
        cache_time: 300, inline_query_id: query.id, results: urls.map(o => {
            return { id: o.url, type: "article", title: o.title, description: o.description, url: o.url, input_message_content: { message_text: `<a href="${o.url}">${o.title}</a>`, parse_mode: "HTML" } }
        })
    });
}
class TGEvent {
    static Update: string = "update";
}
const EE = new events.EventEmitter();
EE.addListener(TGEvent.Update, (update: TgBotAPI.Update) => {
    console.log("Received update [" + update.update_id + "], handling...");
    if (update.inline_query)
        handleInlineQuery(update.inline_query);
})

async function main() {
    let last_received_update_id = 0;
    while (true) {
        console.log(`[${Date.now()}]`);
        const updates = await getUpdates({ offset: last_received_update_id + 1 });
        for (let update of updates) {
            EE.emit(TGEvent.Update, update);
            last_received_update_id = update.update_id;
        }
    }
}
main();