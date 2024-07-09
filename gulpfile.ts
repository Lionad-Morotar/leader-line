import { parallel, series } from 'gulp'
import { buildESM } from './build/esm'

const task = series(
  buildESM
)

export default task
