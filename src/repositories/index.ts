import { AppRepository } from './AppRepository';
import { localRepository } from './LocalRepository';

let activeRepository: AppRepository = localRepository;

export function getRepository(): AppRepository {
  return activeRepository;
}

export function setRepository(repository: AppRepository): void {
  activeRepository = repository;
}

export { AppRepository } from './AppRepository';
export { localRepository } from './LocalRepository';
