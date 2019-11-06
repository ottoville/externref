using Microsoft.VisualStudio.TestTools.UnitTesting;
using OpenQA.Selenium;
using OpenQA.Selenium.Chrome;
using OpenQA.Selenium.Support.UI;
using SeleniumExtras.WaitHelpers;
using System;
using System.Collections.Generic;

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
        public void PickingRay()
        {
            _driver.Url = "https://terrasim.azurewebsites.net/";
            var myDynamicElement = (new WebDriverWait(_driver, TimeSpan.FromSeconds(30))).Until(ExpectedConditions.PresenceOfAllElementsLocatedBy(By.CssSelector("#loginmethods > button:nth-child(4)")));
            myDynamicElement[0].Click();
            var canvas = (new WebDriverWait(_driver, TimeSpan.FromSeconds(30))).Until(ExpectedConditions.PresenceOfAllElementsLocatedBy(By.CssSelector("canvas")))[0];
            var jsexecutor = (IJavaScriptExecutor)_driver;
            var test = (Dictionary<string, object>)jsexecutor.ExecuteAsyncScript(@"
                        let callback=arguments[0];
                        window.sceneInited.then((scene) => {
                            let engine = scene.getEngine();
                            scene.terrainReady.then(function (ground) {
                                var ray = BABYLON.Ray.Zero();
                                var world = ground.getWorldMatrix();
                                var cameraViewport = scene.tools['CameraTAB'].camera.viewport;
                                var viewport = cameraViewport.toGlobal(engine.getRenderWidth(), engine.getRenderHeight());
                                var x = 200 / engine.getHardwareScalingLevel() - viewport.x;
                                var y = 200 / engine.getHardwareScalingLevel() - (engine.getRenderHeight() - viewport.y - viewport.height);
                                ray.unprojectRayToRef(x, y, viewport.width, viewport.height, world, scene.tools['CameraTAB'].camera.getViewMatrix(), scene.tools['CameraTAB'].camera.getProjectionMatrix());
                                callback(ray.direction);
                            }).catch(e => {callback('error '+e.toString())})
                        })");
            Assert.IsNotNull(test["x"]);
            Assert.IsNotNull(test["y"]);
            Assert.IsNotNull(test["z"]);
        }

        [TestCleanup]
        public void EdgeDriverCleanup()
        {
            _driver.Quit();
        }
    }
}
