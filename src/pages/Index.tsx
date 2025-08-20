import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  // Mock data for now, we will replace this later
  const studySets: any[] = []; 

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">My Study Sets</h1>
        <Button asChild>
          <Link to="/create">
            <PlusCircle className="mr-2 h-4 w-4" /> Create Set
          </Link>
        </Button>
      </div>

      {studySets.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-lg">
          <h2 className="text-xl font-semibold">No study sets yet!</h2>
          <p className="text-muted-foreground mt-2">
            Click "Create Set" to get started.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {/* This part will be filled in later when we have data */}
        </div>
      )}
    </div>
  );
};

export default Index;