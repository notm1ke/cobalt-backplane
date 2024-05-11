import { AvailabilityRecord, Groups, getAvailability } from '@ilefa/bluestudy';

export const getGlobalAvailability = async (): Promise<AvailabilityRecord[]> =>
    await getAvailability()
        .catch(() => []);

export const getAvailabilityForGroup = async (groupId: Groups): Promise<AvailabilityRecord[]> =>
    await getAvailability(groupId)
        .catch(() => []);

export const getAvailabilityForRoom = async (roomId: number): Promise<AvailabilityRecord[]> =>
    await getAvailability(Groups.All, roomId)
        .catch(() => []);