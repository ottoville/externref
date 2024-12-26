export type DevToolsInterface = {
  get_mesh_directional_light(mesh_id: number): number;
  get_mesh_point_light(mesh_id: number): number;
  get_directional_lights_count(): number;
  get_point_lights_count(): number;
};
