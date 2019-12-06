export class LazyEval {
    private timerStart: number = null;
    private timeoutID: number = null;
    private runned:boolean=false;
    constructor(
        private callback: (...args) => void,
        private initial: boolean = false) {
    }
    eval(timeout: number, ...args) {
        if(this.initial && !this.runned) {
            this.runned=true;
            return this.callback();
        }
        if (this.timerStart === null) {
            this.timerStart = new Date().getTime();
            this.timeoutID = setTimeout(() => this.callback(...args), timeout);
        } else {
            let lazyTimer = timeout - (new Date().getTime() - this.timerStart);
            clearTimeout(this.timeoutID);
            if (lazyTimer <= 0)
                this.run(args);
            else
                this.timeoutID = setTimeout(this.run.bind(this, args), lazyTimer);
        }
    }
    run(args:any[]) {
        this.timerStart = null;
        this.timeoutID = null;
        this.callback(...args);
    }
}