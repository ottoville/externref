var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var BlazorRouter = new Promise((resolve, reject) => {
    window.initRouter = resolve;
});
window.fbAsyncInit = function () {
    FB.init({
        appId: '417236772473746',
        cookie: true,
        xfbml: true,
        version: 'v4.0'
    });
    FB.AppEvents.logPageView();
    FB.Event.subscribe('auth.login', () => {
        FB.api('/me', { locale: 'en_US', fields: 'name, email' }, function (userinfo) {
            return __awaiter(this, void 0, void 0, function* () {
                (yield BlazorRouter).invokeMethodAsync('startGame');
            });
        });
    });
    FB.getLoginStatus((response) => {
        if (response.status === 'connected') {
            FB.api('/me', { locale: 'en_US', fields: 'name, email' }, function (userinfo) {
                return __awaiter(this, void 0, void 0, function* () {
                    (yield BlazorRouter).invokeMethodAsync('startGame');
                });
            });
        }
    });
};
