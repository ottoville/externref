
const loginf = async (e: any, method: string | undefined, callback: (obj: { provider: string, accessToken: string, pointerEvent:PointerEvent }) => void) => {
  //  loadelem.style.display = 'block';
    // blazor.invokeMethod('setProgress', 0);
    //progelem.max = 100;
    //progelem.value = 0;
    if (method == "facebook") {
        FB.login(() => {
            FB.init({
                appId: '417236772473746',
                cookie: true,
                xfbml: true,
                version: 'v4.0'
            });
            FB.AppEvents.logPageView();
            //@ts-ignore
            FB.Event.subscribe('auth.login', async (response) => {
                //progelem.value = 5;
               // (await BlazorRouter).invokeMethod('startGame');
                //progelem.value = 10;
              //  login({ provider: 'facebook', accessToken: response.authResponse.accessToken, userID: response.authResponse.userID, pointerEvent: e });
            });
            FB.getLoginStatus(async (response) => {
                if (response.status === 'connected') {
                    // progelem.value = 5;
                  //  (await BlazorRouter).invokeMethod('startGame');
                    // progelem.value = 10;
                   // login({ provider: 'facebook', accessToken: response.authResponse.accessToken, userID: response.authResponse.userID, pointerEvent: e });
                }
            });
        }, { scope: "email" });
    }
    else {
        console.log('anomyous clicked')
        //progelem.value = 5;
        //(await BlazorRouter).invokeMethod('startGame');
        //progelem.value = 10;
        if (typeof (localStorage.accessToken) === 'undefined')
            localStorage.accessToken = new Date().getTime().toString() + navigator.userAgent;
        callback({ provider: 'anomyous', accessToken: localStorage.accessToken, pointerEvent: e });
    }
};
export const Login = ((props: { callback: (obj: { provider: string, accessToken: string, pointerEvent: PointerEvent }) => void, children?: any }, ): HTMLElement => {
    return <div>

    <h3>Select your language</h3>
    <select>

    </select>
    <h3>Log in to play the game</h3>
    <fieldset id="loginmethods">
            <button onClick={(e: PointerEvent) => loginf(e, 'facebook', props.callback)}>Login with facebook</button>
        <br /><br />
            <button onClick={(e: PointerEvent) => loginf(e, 'anomyous', props.callback)}>Continue without logging in and online features</button>
        { props.children }
    </fieldset>
    </div>;
})