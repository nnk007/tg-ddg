declare namespace NodeJS {
    interface Process extends EventEmitter {
        env:{TOKEN:string}
    }
}