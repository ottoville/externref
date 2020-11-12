/*
    This LazyEval class is used to set fixed time between repeatly called functions.
    Created: Otto-Ville Lamminpää
 */
export class LazyEval {
    #timerStart: number | null = null;
    #timeoutID: number = 0;
    #runned:boolean=false;
    constructor(
        private callback: (...args: any[]) => void,
        private initial: boolean = false) {
    }
    eval(timeout: number, ...args: any[]) {
        if(this.initial && !this.#runned) {
            this.#runned=true;
            return this.callback();
        }
        if (this.#timerStart === null) {
            this.#timerStart = new Date().getTime();
            this.#timeoutID = setTimeout(() => this.callback(...args), timeout);
        } else {
            let lazyTimer = timeout - (new Date().getTime() - this.#timerStart);
            clearTimeout(this.#timeoutID);
            if (lazyTimer <= 0)
                this.run(args);
            else
                this.#timeoutID = setTimeout(this.run.bind(this, args), lazyTimer);
        }
    }
    run(args:any[]) {
        this.#timerStart = null;
        this.callback(...args);
    }
}