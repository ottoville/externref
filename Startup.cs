using Microsoft.AspNetCore.Components.Builder;
using Microsoft.Extensions.DependencyInjection;
namespace TerraSim
{
    public class Startup
    {
        public void ConfigureServices(IServiceCollection services)
        {
            //services.AddApplicationInsightsTelemetry();

        }

        public void Configure(IComponentsApplicationBuilder app)
        {
            app.AddComponent<App>("app");           
        }
    }
}
