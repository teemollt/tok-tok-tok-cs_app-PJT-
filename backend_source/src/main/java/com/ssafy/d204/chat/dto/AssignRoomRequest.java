package com.ssafy.d204.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class AssignRoomRequest {
    String sessionId;
    int admin_pk_idx;
}