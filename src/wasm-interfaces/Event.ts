export const EventInterface = {
  prevent_default(evt: Event) {
    evt.preventDefault();
  },
  stop_propagation(evt: Event) {
    evt.stopPropagation();
  },
};
