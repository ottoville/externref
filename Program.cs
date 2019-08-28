using Microsoft.AspNetCore.Blazor.Hosting;

namespace BlazorApp1
{
    public class Program
    {
        public static void Main(string[] args)
        {
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
