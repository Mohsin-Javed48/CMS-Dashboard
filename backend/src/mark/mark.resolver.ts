import { Query, Mutation, Args, Resolver } from '@nestjs/graphql';
import { MarkService } from './mark.service';
import { Mark } from './model/mark.model';
import { CreateMarkInput } from './dto/create-mark.input';
import { UpdateMarkInput } from './dto/update-mark.input';

@Resolver(() => Mark)
export class MarkResolver {
  constructor(private markService: MarkService) {}

  @Mutation(() => Mark)
  createMark(@Args('input') input: CreateMarkInput) {
    return this.markService.createMark(input);
  }

  @Query(() => [Mark])
  getMarks() {
    return this.markService.findAll();
  }

  @Query(() => Mark)
  getMarksByStudentId(@Args('id') id: number) {
    return this.markService.findOne(id);
  }

  @Mutation(() => Mark)
  updateMark(@Args('id') id: number, @Args('input') input: UpdateMarkInput) {
    return this.markService.updateMark(id, input);
  }

  @Mutation(() => Mark)
  deleteMark(@Args('id') id: number) {
    return this.markService.deleteMark(id);
  }
}
