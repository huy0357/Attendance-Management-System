package org.example.ams_be.dto.request;

import org.example.ams_be.entity.Account;

public class UpdateAccountRequest {

    private String username;
    private Account.Role role;
    private Boolean isActive;



    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public Account.Role getRole() { return role; }
    public void setRole(Account.Role role) { this.role = role; }

    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
}
