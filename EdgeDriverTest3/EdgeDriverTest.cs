using Microsoft.VisualStudio.TestTools.UnitTesting;
using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using OpenQA.Selenium.Support.UI;
using SeleniumExtras.WaitHelpers;
using System;

namespace EdgeDriverTest3
{
    [TestClass]
    public class EdgeDriverTest
    {
        // In order to run the below test(s), 
        // please follow the instructions from http://go.microsoft.com/fwlink/?LinkId=619687
        // to install Microsoft WebDriver.

        private ChromeDriver _driver;

        [TestInitialize]
        public void EdgeDriverInitialize()
        {
            var servicePath = Environment.GetEnvironmentVariable("ChromeWebDriver");
            if(servicePath=="" || servicePath==null)
            {
                servicePath = "C:\\Users\\ottov\\source\\repos\\terra\\terrasim\\EdgeDriverTest3";
            }
            _driver = new ChromeDriver(servicePath);
        }

        [TestMethod]
        public void VerifyPageTitle()
        {
            // Replace with your own test logic
            _driver.Url = "https://localhost:44316/";
            var myDynamicElement = (new WebDriverWait(_driver, TimeSpan.FromSeconds(30))).Until(ExpectedConditions.PresenceOfAllElementsLocatedBy(By.CssSelector("#loginmethods > button:nth-child(4)")));
            myDynamicElement[0].Click();
            var canvas = (new WebDriverWait(_driver, TimeSpan.FromSeconds(30))).Until(ExpectedConditions.PresenceOfAllElementsLocatedBy(By.CssSelector("canvas")))[0];

            var test = (IJavaScriptExecutor)_driver.ExecuteAsyncScript(@"
                        window.sceneInited.then((scene) => {
                            let callback=arguments[0];
                            scene.terrainReady.then(function (ground) {
                                console.log('terrain is Ready');
                                var ray = BABYLON.Ray.Zero();
                                var ground = arr[0];
                                var world = ground.getWorldMatrix();
                                console.log('get cameraViewport');
                                var cameraViewport = scene.tools['CameraTAB'].camera.viewport;
                                console.log('get cameraViewport.toGlobal');
                                var viewport = cameraViewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
                                var x = 200 / engine.getHardwareScalingLevel() - viewport.x;
                                var y = 200 / engine.getHardwareScalingLevel() - (engine.getRenderHeight() - viewport.y - viewport.height);
                                console.log(ray.unprojectRayToRef(x, y, viewport.width, viewport.height, world, scene.tools['CameraTAB'].camera.getViewMatrix(), scene.tools['CameraTAB'].camera.getProjectionMatrix()));
                                console.log(ray.direction);
                                //if (Number.isNaN(ray.direction.x) || Number.isNaN(ray.direction.y) || Number.isNaN(ray.direction.z)) {
                                throw new Error('Creating picking ray failed');
                                callback();
                            }).catch(rej)
                        })");
            System.Console.WriteLine(test);
            canvas.Click();
            Assert.AreEqual("BingX", _driver.Title);
        }

        [TestCleanup]
        public void EdgeDriverCleanup()
        {
            _driver.Quit();
        }
    }
}
