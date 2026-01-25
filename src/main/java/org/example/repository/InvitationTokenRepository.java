package org.example.repository;

import org.example.models.InvitationToken;
import org.example.models.Organization;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface InvitationTokenRepository extends JpaRepository<InvitationToken, Long> {
    
    Optional<InvitationToken> findByToken(String token);
    
    Optional<InvitationToken> findByEmailAndOrganizationAndUsedFalse(String email, Organization organization);
    
    @Query("SELECT it FROM InvitationToken it JOIN FETCH it.invitedBy WHERE it.organization.id = :organizationId AND it.used = false")
    List<InvitationToken> findByOrganizationIdAndUsedFalse(@Param("organizationId") Long organizationId);
    
    List<InvitationToken> findByOrganizationId(Long organizationId);
    
    List<InvitationToken> findByEmailAndUsedFalse(String email);
    
    boolean existsByEmailAndOrganizationIdAndUsedFalse(String email, Long organizationId);
    
    /**
     * Delete expired tokens (cleanup)
     */
    @Modifying
    @Query("DELETE FROM InvitationToken it WHERE it.expiresAt < :now AND it.used = false")
    int deleteExpiredTokens(@Param("now") LocalDateTime now);
    
    /**
     * Invalidate all pending invitations for a specific email in an organization
     */
    @Modifying
    @Query("UPDATE InvitationToken it SET it.used = true WHERE it.email = :email AND it.organization.id = :orgId AND it.used = false")
    int invalidatePendingInvitations(@Param("email") String email, @Param("orgId") Long organizationId);
}








