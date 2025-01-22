export interface StateMachine {
  id: string,
  state: string,
  data: object,
  constants?: object
}

export interface Location {
  latitude?: number
  longitude?: number
  address?: string
}
