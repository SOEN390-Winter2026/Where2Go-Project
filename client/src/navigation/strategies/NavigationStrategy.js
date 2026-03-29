export default class NavigationStrategy {

  async getRoutes(origin, destination) {
    throw new Error(`getRoutes() must be implemented by ${this.constructor.name}`);
  }
  
  get mode() {
    throw new Error(`mode getter must be implemented by ${this.constructor.name}`);
  }
}