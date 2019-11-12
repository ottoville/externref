using Microsoft.AspNetCore.Blazor.Hosting;
using System.Globalization;

namespace TerraSim
{
    public class Program
    {
        public static void Main(string[] args)
        {
            CultureInfo.CurrentCulture = new CultureInfo("fi-FI");
            //CreateHostBuilder(args).Build().Run();

            BlazorWebAssemblyHost.CreateDefaultBuilder()
                .UseBlazorStartup<Startup>().Build().Run(); 
        }

       /* public static IWebAssemblyHostBuilder CreateHostBuilder(string[] args) {
            return BlazorWebAssemblyHost.CreateDefaultBuilder()
                .UseBlazorStartup<Startup>();
        }*/
    }
}
