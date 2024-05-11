import { DiningHallResponse, DiningHallType, getMenu } from '@ilefa/blueplate';

export const getMenus = async (): Promise<DiningHallResponse[]> =>
    await Promise.all(
        Object
            .values(DiningHallType)
            .map(async hall => await getMenu(hall))
    );