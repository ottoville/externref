var BlazorRouter : Promise<any> = new Promise((resolve, reject) => {
    (<any>window).initRouter = resolve
});
(<any>window).fbAsyncInit = function () {
    FB.init({
        appId: '417236772473746',
        cookie: true,
        xfbml: true,
        version: 'v4.0'
    });
    FB.AppEvents.logPageView();
    FB.Event.subscribe('auth.login', () => {
        FB.api('/me', { locale: 'en_US', fields: 'name, email' }, async function (userinfo: { name: string, email: string }) {
            (await BlazorRouter).invokeMethodAsync('startGame');
        });
    });
    FB.getLoginStatus((response) => {
        if (response.status === 'connected') {
            FB.api('/me', { locale: 'en_US', fields: 'name, email' }, async function (userinfo: { name: string, email: string }) {
                (await BlazorRouter).invokeMethodAsync('startGame');
            })
        }
    });
};