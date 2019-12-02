import { actionTypes } from "./actionTypes";
import { http, isNullOrUndefined } from '../common';
import { accessTokenSub, getUser, getContinuationToken } from '../selectors';
import notificationTypes from '../pushNotifications/notificationTypes';

export function getUserNotifications() {
    return async (dispatch, getState) => {
        const state = getState();

        const userIdentityId = accessTokenSub(state);

        dispatch(getUserNotificationsRequest());

        const response = await http.getWithHeaders(`/notifications/user/${userIdentityId}`, getUser(state), {
            'x-ms-continuation': getContinuationToken(state),
        });

        if (response.error) {
            dispatch(getUserNotificationsFailure());
        } else {
            getUserUnacknowledgedNotifications(response.result, userIdentityId).forEach(alert =>
                dispatch(queueUnacknowledgedNotification(alert))
            );
            dispatch(getUserNotificationsSuccess(response.result, response.headers.get('x-ms-continuation')));
        }
    };
}

export const getUserUnacknowledgedNotifications = (notifications, userIdentityId) => {
    return notifications
        .filter(userNotification => userNotification.notificationType === notificationTypes.ACTIVATION)
        .filter(notification => notification.notifiedUsers
            .some(user => user.identityId === userIdentityId))
        .filter(notification => isNullOrUndefined(notification.notifiedUsers
            .find(user => user.identityId === userIdentityId).acknowledgedDateTime)
        );
};

export function queueUnacknowledgedNotification(unacknowledgedNotification) {
    return {
        type: actionTypes.NOTIFICATION_PUSH,
        notification: unacknowledgedNotification,
    };
};

export function getUserNotificationsRequest() {
    return { type: actionTypes.GET_USER_NOTIFICATIONS_REQUEST };
};

export function getUserNotificationsFailure() {
    return { type: actionTypes.GET_USER_NOTIFICATIONS_FAILURE };
};

export function getUserNotificationsSuccess(notifications, continuationToken) {
    return {
        type: actionTypes.GET_USER_NOTIFICATIONS_SUCCESS,
        userNotifications: notifications,
        continuationToken: continuationToken,
    };
};





