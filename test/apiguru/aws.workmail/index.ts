// DO NOT EDIT THIS FILE

import { NgModule, InjectionToken } from "@angular/core";
import {
  HttpClientModule,
  HTTP_INTERCEPTORS,
  HttpInterceptor
} from "@angular/common/http";
export { CommonException } from "./src/CommonException";
import { Api } from "./src/Api";
export { Api } from "./src/Api";

export { Aliases } from "./src/models/Aliases";
export {
  AssociateDelegateToResourceRequest
} from "./src/models/AssociateDelegateToResourceRequest";
export {
  AssociateDelegateToResourceResponse
} from "./src/models/AssociateDelegateToResourceResponse";
export {
  AssociateMemberToGroupRequest
} from "./src/models/AssociateMemberToGroupRequest";
export {
  AssociateMemberToGroupResponse
} from "./src/models/AssociateMemberToGroupResponse";
export { BookingOptions } from "./src/models/BookingOptions";
export { Boolean } from "./src/models/Boolean";
export { CreateAliasRequest } from "./src/models/CreateAliasRequest";
export { CreateAliasResponse } from "./src/models/CreateAliasResponse";
export { CreateGroupRequest } from "./src/models/CreateGroupRequest";
export { CreateGroupResponse } from "./src/models/CreateGroupResponse";
export { CreateResourceRequest } from "./src/models/CreateResourceRequest";
export { CreateResourceResponse } from "./src/models/CreateResourceResponse";
export { CreateUserRequest } from "./src/models/CreateUserRequest";
export { CreateUserResponse } from "./src/models/CreateUserResponse";
export { Delegate } from "./src/models/Delegate";
export { DeleteAliasRequest } from "./src/models/DeleteAliasRequest";
export { DeleteAliasResponse } from "./src/models/DeleteAliasResponse";
export { DeleteGroupRequest } from "./src/models/DeleteGroupRequest";
export { DeleteGroupResponse } from "./src/models/DeleteGroupResponse";
export { DeleteResourceRequest } from "./src/models/DeleteResourceRequest";
export { DeleteResourceResponse } from "./src/models/DeleteResourceResponse";
export { DeleteUserRequest } from "./src/models/DeleteUserRequest";
export { DeleteUserResponse } from "./src/models/DeleteUserResponse";
export {
  DeregisterFromWorkMailRequest
} from "./src/models/DeregisterFromWorkMailRequest";
export {
  DeregisterFromWorkMailResponse
} from "./src/models/DeregisterFromWorkMailResponse";
export { DescribeGroupRequest } from "./src/models/DescribeGroupRequest";
export { DescribeGroupResponse } from "./src/models/DescribeGroupResponse";
export {
  DescribeOrganizationRequest
} from "./src/models/DescribeOrganizationRequest";
export {
  DescribeOrganizationResponse
} from "./src/models/DescribeOrganizationResponse";
export { DescribeResourceRequest } from "./src/models/DescribeResourceRequest";
export {
  DescribeResourceResponse
} from "./src/models/DescribeResourceResponse";
export { DescribeUserRequest } from "./src/models/DescribeUserRequest";
export { DescribeUserResponse } from "./src/models/DescribeUserResponse";
export {
  DirectoryServiceAuthenticationFailedException
} from "./src/models/DirectoryServiceAuthenticationFailedException";
export {
  DirectoryUnavailableException
} from "./src/models/DirectoryUnavailableException";
export {
  DisassociateDelegateFromResourceRequest
} from "./src/models/DisassociateDelegateFromResourceRequest";
export {
  DisassociateDelegateFromResourceResponse
} from "./src/models/DisassociateDelegateFromResourceResponse";
export {
  DisassociateMemberFromGroupRequest
} from "./src/models/DisassociateMemberFromGroupRequest";
export {
  DisassociateMemberFromGroupResponse
} from "./src/models/DisassociateMemberFromGroupResponse";
export { EmailAddress } from "./src/models/EmailAddress";
export {
  EmailAddressInUseException
} from "./src/models/EmailAddressInUseException";
export {
  EntityAlreadyRegisteredException
} from "./src/models/EntityAlreadyRegisteredException";
export { EntityNotFoundException } from "./src/models/EntityNotFoundException";
export { EntityStateException } from "./src/models/EntityStateException";
export { Group } from "./src/models/Group";
export { GroupName } from "./src/models/GroupName";
export { Groups } from "./src/models/Groups";
export {
  InvalidConfigurationException
} from "./src/models/InvalidConfigurationException";
export {
  InvalidParameterException
} from "./src/models/InvalidParameterException";
export {
  InvalidPasswordException
} from "./src/models/InvalidPasswordException";
export { ListAliasesRequest } from "./src/models/ListAliasesRequest";
export { ListAliasesResponse } from "./src/models/ListAliasesResponse";
export { ListGroupMembersRequest } from "./src/models/ListGroupMembersRequest";
export {
  ListGroupMembersResponse
} from "./src/models/ListGroupMembersResponse";
export { ListGroupsRequest } from "./src/models/ListGroupsRequest";
export { ListGroupsResponse } from "./src/models/ListGroupsResponse";
export {
  ListOrganizationsRequest
} from "./src/models/ListOrganizationsRequest";
export {
  ListOrganizationsResponse
} from "./src/models/ListOrganizationsResponse";
export {
  ListResourceDelegatesRequest
} from "./src/models/ListResourceDelegatesRequest";
export {
  ListResourceDelegatesResponse
} from "./src/models/ListResourceDelegatesResponse";
export { ListResourcesRequest } from "./src/models/ListResourcesRequest";
export { ListResourcesResponse } from "./src/models/ListResourcesResponse";
export { ListUsersRequest } from "./src/models/ListUsersRequest";
export { ListUsersResponse } from "./src/models/ListUsersResponse";
export {
  MailDomainNotFoundException
} from "./src/models/MailDomainNotFoundException";
export {
  MailDomainStateException
} from "./src/models/MailDomainStateException";
export { MaxResults } from "./src/models/MaxResults";
export { Member } from "./src/models/Member";
export { Members } from "./src/models/Members";
export {
  NameAvailabilityException
} from "./src/models/NameAvailabilityException";
export { NextToken } from "./src/models/NextToken";
export { OrganizationId } from "./src/models/OrganizationId";
export { OrganizationName } from "./src/models/OrganizationName";
export {
  OrganizationNotFoundException
} from "./src/models/OrganizationNotFoundException";
export {
  OrganizationStateException
} from "./src/models/OrganizationStateException";
export { OrganizationSummaries } from "./src/models/OrganizationSummaries";
export { OrganizationSummary } from "./src/models/OrganizationSummary";
export { Password } from "./src/models/Password";
export {
  RegisterToWorkMailRequest
} from "./src/models/RegisterToWorkMailRequest";
export {
  RegisterToWorkMailResponse
} from "./src/models/RegisterToWorkMailResponse";
export { ReservedNameException } from "./src/models/ReservedNameException";
export { ResetPasswordRequest } from "./src/models/ResetPasswordRequest";
export { ResetPasswordResponse } from "./src/models/ResetPasswordResponse";
export { Resource } from "./src/models/Resource";
export { ResourceDelegates } from "./src/models/ResourceDelegates";
export { ResourceId } from "./src/models/ResourceId";
export { ResourceName } from "./src/models/ResourceName";
export { Resources } from "./src/models/Resources";
export { String } from "./src/models/String";
export { Timestamp } from "./src/models/Timestamp";
export {
  UnsupportedOperationException
} from "./src/models/UnsupportedOperationException";
export {
  UpdatePrimaryEmailAddressRequest
} from "./src/models/UpdatePrimaryEmailAddressRequest";
export {
  UpdatePrimaryEmailAddressResponse
} from "./src/models/UpdatePrimaryEmailAddressResponse";
export { UpdateResourceRequest } from "./src/models/UpdateResourceRequest";
export { UpdateResourceResponse } from "./src/models/UpdateResourceResponse";
export { User } from "./src/models/User";
export { UserName } from "./src/models/UserName";
export { Users } from "./src/models/Users";
export { WorkMailIdentifier } from "./src/models/WorkMailIdentifier";
export { EntityState } from "./src/models/EntityState";
export { MemberType } from "./src/models/MemberType";
export { ResourceType } from "./src/models/ResourceType";
export { UserRole } from "./src/models/UserRole";

@NgModule({
  imports: [HttpClientModule],
  declarations: [],
  providers: [Api],
  exports: []
})
export class ApiModule {}
