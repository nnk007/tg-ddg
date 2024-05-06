declare namespace TgBotAPI {
    interface SuccessfulResponse<T>{
        ok:true,
        result:T[]
    }
    interface UnsuccessfulResponse {
        ok:false,
        description:string,
        error_code:number
        parameters?:any
    }
    interface Response<T> extends SuccessfulResponse<T>, UnsuccessfulResponse{};
    interface InlineQuery {
        id: string,
        from: TgBotAPI.User,
        query:string,
        offset:string
    }
    interface Update {
        update_id:number,
        inline_query:InlineQuery
    }
}