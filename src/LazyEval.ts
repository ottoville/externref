/*
    This LazyEval class is used to set fixed time between repeatly called functions.
    Created: Otto-Ville Lamminpää

    Usage:

    let l = new LazyEval(() => {
        console.log('function evaluated);
    });
    window.addEventListener('mousemove', function() {
        l.eval(32); //Evaluate every 32 millisecond, 30fps/s
    })

 */
export class LazyEval {
    #timerStart: number | null = null;
    #timeoutID: number = 0;
    constructor(
        private callback: (...args: any[]) => void) {
    }
    eval(timeout: number, ...args: any[]) {
        if (this.#timerStart === null) {
            this.#timerStart = Date.now();
            this.#timeoutID = setTimeout(() => this.run(args), timeout);
        } else {
            let lazyTimer = timeout - (Date.now() - this.#timerStart);
            clearTimeout(this.#timeoutID);
            if (lazyTimer <= 0)
                this.run(args);
            else
                this.#timeoutID = setTimeout(() => this.run(args), lazyTimer);
        }
    }
    run(args:any[]) {
        this.#timerStart = null;
        this.callback(...args);
    }
}