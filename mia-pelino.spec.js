import { getUserNotifications, getUserUnacknowledgedNotifications } from "./scratch";
import notificationTypes from "../pushNotifications/notificationTypes";
import { actionTypes } from "./actionTypes";
import * as httpModule from "../common/http";

jest.mock('../common/alert', () => {
    return {
        Alert: { alert: jest.fn() },
    };
});

describe('user notification actions for unacknowledged notifications', () => {
    let actionThunk, dispatch, getState, fakeState;
    const userSub = '123123';

    const fakeNotifications = {
        result: [
            {
                id: '1',
                notificationType: notificationTypes.ACTIVATION,
                notifiedUsers: [{ identityId: userSub, acknowledgedDateTime: '2019-11-04T04:32.543Z' }],
            },
            {
                id: '2',
                notificationType: notificationTypes.ACTIVATION,
                notifiedUsers: [{ identityId: userSub }],
            },
        ],
        headers: new Map([['x-ms-continuation', '']]),
    };

    beforeEach(() => {
        fakeState = {
            user: {
                accessToken:
                    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjMxMjMiLCJhY2NvdW50X2lkIjoiNDU2NDU2In0.D1xPUwIeboAJsLf7szqyvSsEjvpXlXniT_xxz3DGh4I',
            },
            notification: {
                userNotifications: {},
                continuationToken: '',
                resultsRemaining: true,
            },
            requests: {
                GET_USER_NOTIFICATIONS: false,
            },
        };

        dispatch = jest.fn();
        getState = jest.fn(() => fakeState);

        actionThunk = getUserNotifications();
        httpModule.http.getWithHeaders = jest.fn(() => Promise.resolve(fakeNotifications));
    });

    it('returns an empty list if given an empty list of notifications', () => {
        expect(getUserUnacknowledgedNotifications([], userSub)).toStrictEqual([]);
    });

    it('returns unacknowledged notification for user', () => {
        expect(getUserUnacknowledgedNotifications(fakeNotifications.result, userSub)).toStrictEqual([
            fakeNotifications.result[1],
        ]);
    });

    it('returns an empty list if notifications are not type Activation', () => {
        const notifications = {
            id: '1',
            notificationType: notificationTypes.INTERVAL,
            notifiedUsers: [{ identityId: userSub }],
        };
        expect(getUserUnacknowledgedNotifications([notifications], userSub)).toStrictEqual([]);
    });

    it("returns an empty list if no notifications contain user id", () => {
        expect(getUserUnacknowledgedNotifications(fakeNotifications.result, '12345')).toStrictEqual([]);
    });

    it('returns empty list if all notifications are acknowledged', () => {
        const notifications = {
            id: '1',
            notificationType: notificationTypes.ACTIVATION,
            notifiedUsers: [{ identityId: userSub, acknowledgedDateTime: '2019-11-04T04:32.543Z' }],
        };
        expect(getUserUnacknowledgedNotifications([notifications], userSub)).toStrictEqual([]);
    });

    it('dispatches action to signal get user notifications request', async () => {
      await actionThunk(dispatch, getState);

      expect(dispatch).toHaveBeenCalledWith({ type: actionTypes.GET_USER_NOTIFICATIONS_REQUEST });
    });

    it('dispatches action to store retrieved user notifications on successful response', async () => {
      await actionThunk(dispatch, getState);

      expect(dispatch).toHaveBeenCalledWith({
        type: actionTypes.GET_USER_NOTIFICATIONS_SUCCESS,
        userNotifications: fakeNotifications.result,
        continuationToken: '',
      });
    });

    it('dispatches action to store, pushing unacknowledged notifications onto the current notification queue', async () => {
        await actionThunk(dispatch, getState);

        expect(dispatch).toHaveBeenNthCalledWith(2, {
            type: actionTypes.NOTIFICATION_PUSH,
            notification: fakeNotifications.result[1],
        });
    });

    it('dispatches action on failure', async () => {
        httpModule.http.getWithHeaders = jest.fn(() => Promise.resolve({ error: 'error' }));
        await actionThunk(dispatch, getState);

        expect(dispatch).toHaveBeenCalledWith({
            type: actionTypes.GET_USER_NOTIFICATIONS_FAILURE,
        });
    });
});


