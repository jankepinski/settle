export interface User {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  createdAt: Date;
}

export interface UserDTO {
  id: string;
  email: string;
  name: string;
}

export function toUserDTO(user: User): UserDTO {
  return { id: user.id, email: user.email, name: user.name };
}
